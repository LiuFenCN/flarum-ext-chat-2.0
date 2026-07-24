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
            Schema\Integer::make('userId'),
            Schema\Integer::make('chatId'),
            Schema\Integer::make('deletedBy'),
            Schema\Boolean::make('isReaded'),
            Schema\DateTime::make('createdAt'),
            Schema\DateTime::make('editedAt'),
            Schema\Boolean::make('isCensored')
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
