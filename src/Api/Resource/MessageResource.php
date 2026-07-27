<?php

namespace Xelson\Chat\Api\Resource;

use Flarum\Api\Context;
use Flarum\Api\Endpoint;
use Flarum\Api\Resource\AbstractDatabaseResource;
use Flarum\Api\Schema;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Xelson\Chat\Message;

class MessageResource extends AbstractDatabaseResource
{
    public function type(): string
    {
        return 'chatmessages';
    }

    public function model(): string
    {
        return Message::class;
    }

    /**
     * Replicates FetchMessageController: filter by `chat_id`, and optionally
     * fetch messages newer than the `query` (message id) cursor.
     */
    public function scope(Builder $query, \Tobyz\JsonApiServer\Context $context): void
    {
        $params = $context->request->getQueryParams();

        if ($chatId = Arr::get($params, 'chat_id')) {
            $query->where('chat_id', $chatId);
        }

        if (is_numeric($queryCursor = Arr::get($params, 'query'))) {
            $query->where('id', '>', $queryCursor);
        }
    }

    public function endpoints(): array
    {
        return [
            Endpoint\Show::make()
                ->authenticated()
                ->defaultInclude(['user', 'deleted_by', 'chat']),
            Endpoint\Index::make()
                ->authenticated()
                ->defaultInclude(['user', 'deleted_by', 'chat'])
                ->paginate(),
        ];
    }

    public function fields(): array
    {
        return [
            Schema\Str::make('message')
                ->get(function (Message $message, Context $context) {
                    $settings = resolve(SettingsRepositoryInterface::class);

                    if ($settings->get('xelson-chat.settings.display.censor') && ! $context->getActor()->id) {
                        return str_repeat('*', strlen($message->message));
                    }

                    return $message->message;
                }),
            Schema\Integer::make('type'),
            Schema\Integer::make('userId')
                ->get(fn(Message $m) => (int) $m->user_id),
            Schema\Integer::make('chatId')
                ->get(fn(Message $m) => (int) $m->chat_id),
            Schema\Integer::make('deletedBy')
                ->get(fn(Message $m) => $m->deleted_by),
            // NOTE: frontend Message model reads snake_case attributes
            // (is_readed / created_at / edited_at / is_censored). Flarum 2.0's
            // JSON:API server serializes the field name verbatim, so these MUST
            // stay snake_case or the JS attributes resolve to undefined and any
            // `.toISOString()` call crashes the chat viewport.
            Schema\Boolean::make('is_readed'),
            Schema\DateTime::make('created_at'),
            Schema\DateTime::make('edited_at'),
            Schema\Boolean::make('is_censored')
                ->get(function (Message $message, Context $context) {
                    $settings = resolve(SettingsRepositoryInterface::class);

                    return (bool) ($settings->get('xelson-chat.settings.display.censor') && ! $context->getActor()->id);
                }),

            Schema\Relationship\ToOne::make('user')
                ->includable()
                ->type('users'),
            Schema\Relationship\ToOne::make('deleted_by')
                ->includable()
                ->type('users'),
            Schema\Relationship\ToOne::make('chat')
                ->includable()
                ->type('chats'),
        ];
    }
}
