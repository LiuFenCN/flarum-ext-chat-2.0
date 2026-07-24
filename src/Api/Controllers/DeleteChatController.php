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
use Xelson\Chat\Commands\DeleteChat;

class DeleteChatController implements RequestHandlerInterface
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

        $chat = $this->bus->dispatch(
            new DeleteChat($id, $actor)
        );

        return $this->serializeModel($request, ChatResource::class, $chat);
    }
}
