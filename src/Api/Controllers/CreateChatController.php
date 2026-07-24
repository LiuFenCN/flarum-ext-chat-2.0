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
use Xelson\Chat\Commands\CreateChat;

class CreateChatController implements RequestHandlerInterface
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
        $data = Arr::get($request->getParsedBody(), 'data', []);
        $ipAddress = Arr::get($request->getServerParams(), 'REMOTE_ADDR', '127.0.0.1');

        $chat = $this->bus->dispatch(
            new CreateChat($actor, $data, $ipAddress)
        );

        return $this->serializeModel($request, ChatResource::class, $chat);
    }
}
