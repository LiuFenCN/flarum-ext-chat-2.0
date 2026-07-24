<?php

namespace Xelson\Chat\Api\Resource;

use Flarum\Api\Context;
use Flarum\Api\Endpoint;
use Flarum\Api\Resource\AbstractDatabaseResource;
use Flarum\Api\Schema;
use Illuminate\Database\Eloquent\Builder;
use Xelson\Chat\Chat;
use Xelson\Chat\ChatUser;

class ChatResource extends AbstractDatabaseResource
{
    public function type(): string
    {
        return 'chats';
    }

    public function model(): string
    {
        return Chat::class;
    }

    /**
     * Only chats the actor can see: public channels (type = 1) or chats the
     * actor is a member of. Mirrors ChatRepository::queryVisible().
     */
    public function scope(Builder $query, Context $context): void
    {
        $actor = $context->getActor();

        $query->where(function (Builder $query) use ($actor) {
            $query->where('type', 1);

            if ($actor->id) {
                $ids = ChatUser::where('user_id', $actor->id)->pluck('chat_id')->toArray();

                if ($ids) {
                    $query->orWhereIn('id', $ids);
                }
            }
        });
    }

    public function endpoints(): array
    {
        return [
            Endpoint\Show::make()
                ->authenticated()
                ->defaultInclude(['creator', 'users', 'last_message', 'first_message']),
            Endpoint\Index::make()
                ->authenticated()
                ->defaultInclude(['creator', 'users', 'last_message', 'first_message'])
                ->paginate(),
        ];
    }

    public function fields(): array
    {
        return [
            Schema\Str::make('title'),
            Schema\Integer::make('color'),
            Schema\Str::make('icon'),
            Schema\Integer::make('type'),
            Schema\Integer::make('creatorId'),
            Schema\DateTime::make('createdAt'),

            // Membership fields for the current actor (read-only, no auto-join).
            Schema\Integer::make('role')
                ->get($this->pivotValue('role')),
            Schema\DateTime::make('joinedAt')
                ->get($this->pivotDateTime('joined_at')),
            Schema\DateTime::make('readedAt')
                ->get($this->pivotDateTime('readed_at')),
            Schema\DateTime::make('removedAt')
                ->get($this->pivotDateTime('removed_at')),
            Schema\Integer::make('removedBy')
                ->get($this->pivotValue('removed_by')),
            Schema\Integer::make('unreaded')
                ->get(function (Chat $chat, Context $context) {
                    if (! $context->getActor()->id) {
                        return 0;
                    }

                    $chatUser = ChatUser::where('chat_id', $chat->id)
                        ->where('user_id', $context->getActor()->id)
                        ->first();

                    return $chatUser ? $chat->unreadedCount($chatUser) : 0;
                }),

            Schema\Relationship\ToOne::make('creator')
                ->includable()
                ->type('users'),
            Schema\Relationship\ToMany::make('users')
                ->includable()
                ->type('users'),
            Schema\Relationship\ToMany::make('messages')
                ->includable()
                ->type('chatmessages'),
            Schema\Relationship\ToOne::make('last_message')
                ->includable()
                ->type('chatmessages'),
            Schema\Relationship\ToOne::make('first_message')
                ->includable()
                ->type('chatmessages'),
        ];
    }

    /**
     * Safe pivot lookup (does not auto-create a membership like Chat::getChatUser).
     */
    protected function pivotValue(string $column): callable
    {
        return function (Chat $chat, Context $context) use ($column) {
            if (! $context->getActor()->id) {
                return null;
            }

            return ChatUser::where('chat_id', $chat->id)
                ->where('user_id', $context->getActor()->id)
                ->value($column);
        };
    }

    protected function pivotDateTime(string $column): callable
    {
        return function (Chat $chat, Context $context) use ($column) {
            if (! $context->getActor()->id) {
                return null;
            }

            return ChatUser::where('chat_id', $chat->id)
                ->where('user_id', $context->getActor()->id)
                ->value($column);
        };
    }
}
