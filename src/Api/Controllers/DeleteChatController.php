<?php

namespace Xelson\Chat\Api\Controllers;

use Flarum\Http\RequestUtil;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\EmptyResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Xelson\Chat\Commands\DeleteChat;

class DeleteChatController implements RequestHandlerInterface
{
    public function __construct(Dispatcher $bus)
    {
        $this->bus = $bus;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $id = Arr::get($request->getAttribute('routeParameters'), 'id')
            ?? Arr::get($request->getQueryParams(), 'id');

        // Dispatches DeleteChatHandler which performs the permission check,
        // detaches members and deletes the chat row. The handler is
        // idempotent: if the chat is already gone it returns early and the
        // controller answers 204, so a stale client entry can be dropped
        // without surfacing a 404.
        $this->bus->dispatch(new DeleteChat($id, $actor));

        // The chat no longer exists (or never did), so there is nothing
        // meaningful to serialize back. Return 204 and let the client drop
        // it from its local store (app.store.remove + app.chat.deleteChat).
        return new EmptyResponse(204);
    }
}
