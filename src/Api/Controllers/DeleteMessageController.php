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
use Xelson\Chat\Commands\DeleteMessage;

class DeleteMessageController implements RequestHandlerInterface
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

        $message = $this->bus->dispatch(
            new DeleteMessage($id, $actor)
        );

        return $this->serializeModel($request, MessageResource::class, $message);
    }
}
