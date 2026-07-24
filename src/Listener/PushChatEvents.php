<?php

namespace Xelson\Chat\Listener;

use Flarum\Api\JsonApi;
use Flarum\Http\RequestUtil;
use Illuminate\Contracts\Events\Dispatcher;
use Laminas\Diactoros\ServerRequestFactory;
use Psr\Http\Message\ServerRequestInterface;
use Xelson\Chat\Api\Resource\ChatResource;
use Xelson\Chat\Api\Resource\MessageResource;
use Xelson\Chat\Chat;
use Xelson\Chat\ChatSocket;
use Xelson\Chat\Event\Chat\Saved as ChatSaved;
use Xelson\Chat\Event\Chat\Deleting as ChatDeleting;
use Xelson\Chat\Event\Message\Saved as MessageSaved;
use Xelson\Chat\Event\Message\Deleting as MessageDeleting;

class PushChatEvents
{
    /**
     * @var ChatSocket
     */
    protected $socket;

    /**
     * @var JsonApi
     */
    protected $api;

    public function __construct(ChatSocket $socket, JsonApi $api)
    {
        $this->socket = $socket;
        $this->api = $api;
    }

    public function subscribe(Dispatcher $events)
    {
        $events->listen(ChatSaved::class, [$this, 'whenChatSaved']);
        $events->listen(ChatDeleting::class, [$this, 'whenChatDeleting']);
        $events->listen(MessageSaved::class, [$this, 'whenMessageSaved']);
        $events->listen(MessageDeleting::class, [$this, 'whenMessageDeleting']);
    }

    /**
     * Serialize a model through its Flarum 2.0 resource `show` endpoint so the
     * realtime payload matches what the API would return.
     */
    protected function buildResponse(object $model, $actor, string $resourceClass, array $include = []): array
    {
        $resource = $this->api->getResource($resourceClass);
        $type = $resource->type();

        $request = ServerRequestFactory::fromGlobals();
        $basePath = $request->getUri()->getPath();
        $base = rtrim(dirname($basePath), '/');

        $uri = $request->getUri()
            ->withPath($base . '/' . $model->id)
            ->withQuery('include=' . implode(',', $include));

        $request = RequestUtil::withActor($request, $actor)
            ->withMethod('GET')
            ->withUri($uri);

        $response = $this->api
            ->forResource($resourceClass)
            ->forEndpoint('show')
            ->handle($request);

        return json_decode((string) $response->getBody(), true);
    }

    public function whenChatSaved(ChatSaved $event)
    {
        $chat = $event->chat;

        $response = $this->buildResponse($chat, $event->actor, ChatResource::class, ['creator', 'users', 'last_message']);

        $sendData = [
            'chat' => $response
        ];

        if ($event->created) {
            $type = 'chat.create';
        } else {
            $type = 'chat.edit';
            $sendData['eventmsg_range'] = $chat->eventmsg_range;
            $sendData['roles_updated_for'] = $chat->roles_updated_for;
        }

        $this->socket->sendChatEvent($chat->id, $type, $sendData);
    }

    public function whenChatDeleting(ChatDeleting $event)
    {
        $chat = $event->chat;

        $response = $this->buildResponse($chat, $event->actor, ChatResource::class, ['creator', 'users', 'last_message']);

        $this->socket->sendChatEvent($chat->id, 'chat.delete', [
            'chat' => $response
        ]);
    }

    public function whenMessageSaved(MessageSaved $event)
    {
        $message = $event->message;

        $response = $this->buildResponse($message, $event->actor, MessageResource::class, ['user', 'deleted_by', 'chat']);

        if ($event->created) {
            $type = 'message.post';
        } else {
            $type = 'message.edit';
        }

        $this->socket->sendChatEvent($message->chat_id, $type, [
            'message' => $response
        ]);
    }

    public function whenMessageDeleting(MessageDeleting $event)
    {
        $message = $event->message;

        $response = $this->buildResponse($message, $event->actor, MessageResource::class, ['user', 'deleted_by', 'chat']);

        $this->socket->sendChatEvent($message->chat_id, 'message.delete', [
            'message' => $response
        ]);
    }
}
