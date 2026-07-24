<?php

namespace Xelson\Chat\Api\Controllers;

use Flarum\Api\JsonApi;
use Flarum\Http\RequestUtil;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Xelson\Chat\Api\Resource\MessageResource;
use Xelson\Chat\Commands\PostMessage;

class PostMessageController implements RequestHandlerInterface
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

        $message = $this->bus->dispatch(
            new PostMessage($actor, $data, $ipAddress)
        );

        return $this->serializeModel($request, MessageResource::class, $message);
    }
}
