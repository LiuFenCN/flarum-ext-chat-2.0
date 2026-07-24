<?php

namespace Xelson\Chat\Api\Controllers;

use Flarum\Api\JsonApi;
use Flarum\Http\RequestUtil;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Xelson\Chat\Api\Resource\ChatResource;
use Xelson\Chat\Commands\EditChat;
use Xelson\Chat\Commands\ReadChat;

class EditChatController implements RequestHandlerInterface
{
    use SerializesChatData;

    public function __construct(JsonApi $api, Dispatcher $bus)
    {
        $this->api = $api;
        $this->bus = $bus;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $id = Arr::get($request->getQueryParams(), 'id');
        $data = Arr::get($request->getParsedBody(), 'data', []);
        $ipAddress = Arr::get($request->getServerParams(), 'REMOTE_ADDR', '127.0.0.1');

        $readedAt = Arr::get($data, 'attributes.actions.reading');

        if ($readedAt) {
            $chat = $this->bus->dispatch(
                new ReadChat($id, $actor, $readedAt)
            );
        } else {
            $chat = $this->bus->dispatch(
                new EditChat($id, $actor, $data, $ipAddress)
            );
        }

        return $this->serializeModel($request, ChatResource::class, $chat);
    }
}
