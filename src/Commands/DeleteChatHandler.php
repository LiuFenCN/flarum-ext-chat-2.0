<?php
/*
 * This file is part of xelson/flarum-ext-chat
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Xelson\Chat\Commands;

use Xelson\Chat\ChatRepository;
use Illuminate\Contracts\Bus\Dispatcher as BusDispatcher;
use Illuminate\Contracts\Events\Dispatcher;
use Xelson\Chat\Event\Chat\Deleting;

class DeleteChatHandler
{
    /**
     * @param ChatRepository $chats
     * @param ChatSocket $socket
     * @param Dispatcher $events
     */
    public function __construct(ChatRepository $chats, BusDispatcher $bus, Dispatcher $events)
    {
        $this->chats  = $chats;
        $this->bus = $bus;
        $this->events = $events;
    }

    /**
     * Handles the command execution.
     *
     * @param DeleteChat $command
     * @return null|string
     */
    public function handle(DeleteChat $command)
    {
        $chat_id = $command->chat_id;
        $actor = $command->actor;

        // Idempotent delete: if the chat is already gone (deleted on another
        // client while realtime/Pusher is disabled, or a stale client entry),
        // there is nothing to do. Returning early lets the controller answer
        // 204 so the client can drop the stale entry from its local store
        // instead of surfacing a 404 "Resource not found" error.
        $chat = $this->chats->queryVisible($actor)->find($chat_id);

        if (!$chat) {
            return null;
        }

        $users = $chat->users()->get();

        $actor->assertPermission(
            ($actor->isAdmin() || $chat->creator_id == $actor->id) && (count($users) > 2 || $chat->type == 1)
        );

        $this->events->dispatch(
            new Deleting($chat, $actor)
        );

        $chat->users()->detach();
        $chat->delete();

        return $chat;
    }
}
