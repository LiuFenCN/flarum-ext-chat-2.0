<?php

namespace Xelson\Chat;

use Flarum\Api\Context;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\User\User;
use Xelson\Chat\Api\Controllers\CreateChatController;
use Xelson\Chat\Api\Controllers\DeleteChatController;
use Xelson\Chat\Api\Controllers\DeleteMessageController;
use Xelson\Chat\Api\Controllers\EditChatController;
use Xelson\Chat\Api\Controllers\EditMessageController;
use Xelson\Chat\Api\Controllers\PostMessageController;
use Xelson\Chat\Api\Controllers\SearchChatUsersController;
use Xelson\Chat\Api\Controllers\ShowUserSafeController;
use Xelson\Chat\Api\Resource\ChatResource;
use Xelson\Chat\Api\Resource\MessageResource;
use Xelson\Chat\Api\Throttler\ChatMessage;
use Xelson\Chat\Console\CleanOldMessagesCommand;
use Xelson\Chat\Console\UnreadReminderCommand;
use Xelson\Chat\Listener\PushChatEvents;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    (new Extend\Frontend('forum'))
        ->css(__DIR__ . '/resources/less/forum.less')
        ->js(__DIR__ . '/js/dist/forum.js')
        ->route('/chat', 'chat'),

    (new Extend\Locales(__DIR__ . '/resources/locale')),

    // Register console command for message retention cleanup
    (new Extend\Console())
        ->command(CleanOldMessagesCommand::class)
        ->schedule('chat:clean', function ($event) {
            $event->daily()->withoutOverlapping();
        })
        ->command(UnreadReminderCommand::class)
        ->schedule('chat:unread-reminder', function ($event) {
            $event->daily()->withoutOverlapping()->at('10:00');
        }),

    // Forum-level chat permissions, exposed on the `forum` resource.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(function () {
            $permissions = [
                'xelson-chat.permissions.chat',
                'xelson-chat.permissions.create',
                'xelson-chat.permissions.create.channel',
                'xelson-chat.permissions.enabled',
                'xelson-chat.permissions.edit',
                'xelson-chat.permissions.delete',
            ];

            return array_map(function ($permission) {
                return Schema\Boolean::make($permission)
                    ->get(function ($forum, Context $context) use ($permission) {
                        return $context->getActor()->can($permission);
                    });
            }, $permissions);
        }),

    // Chat + Message resources. Their `index` endpoints auto-register
    // GET /chats and GET /chatmessages (the old ListChatsController /
    // FetchMessageController are replaced by these resource endpoints).
    (new Extend\ApiResource(ChatResource::class)),
    (new Extend\ApiResource(MessageResource::class)),

    (new Extend\Routes('api'))
        ->post('/chats', 'neonchat.chats.create', CreateChatController::class)
        ->patch('/chats/{id}', 'neonchat.chats.edit', EditChatController::class)
        // DELETE route (matches real HTTP DELETE); POST route serves as fallback
        // because Flarum 2.0's app.request() converts DELETE → POST internally
        // and the JSON:API router may reject POST-on-resource before the method-
        // override middleware runs.
        ->delete('/chats/{id}', 'neonchat.chats.delete', DeleteChatController::class)
        ->post('/chats/{id}', 'neonchat.chats.destroy', DeleteChatController::class)
        ->post('/chatmessages', 'neonchat.chatmessages.post', PostMessageController::class)
        ->patch('/chatmessages/{id}', 'neonchat.chatmessages.edit', EditMessageController::class)
        ->delete('/chatmessages/{id}', 'neonchat.chatmessages.delete', DeleteMessageController::class)
        ->get('/chat/user/{id}', 'neonchat.chat.user', ShowUserSafeController::class)
        ->get('/chat-users', 'neonchat.chat.searchUsers', SearchChatUsersController::class),

    (new Extend\Model(User::class))
        ->relationship('chats', function ($user) {
            return $user->belongsToMany(Chat::class, 'neonchat_chat_user')
                ->withPivot('joined_at', 'removed_by', 'role', 'readed_at', 'removed_at');
        }),

    (new Extend\Settings())
        ->serializeToForum('xelson-chat.settings.charlimit', 'xelson-chat.settings.charlimit')
        ->serializeToForum('xelson-chat.settings.display.minimize', 'xelson-chat.settings.display.minimize')
        ->serializeToForum('xelson-chat.settings.display.censor', 'xelson-chat.settings.display.censor')
        ->serializeToForum('xelson-chat.settings.block_guests', 'xelson-chat.settings.block_guests')
        ->serializeToForum('xelson-chat.settings.channel_retention', 'xelson-chat.settings.channel_retention')
        ->serializeToForum('xelson-chat.settings.pm_retention', 'xelson-chat.settings.pm_retention')
        ->serializeToForum('xelson-chat.settings.email_reminder_days', 'xelson-chat.settings.email_reminder_days')
        ->default('xelson-chat.settings.charlimit', '0')
        ->default('xelson-chat.settings.display.minimize', '0')
        ->default('xelson-chat.settings.display.censor', '1')
        ->default('xelson-chat.settings.block_guests', '1')
        ->default('xelson-chat.settings.channel_retention', '2')
        ->default('xelson-chat.settings.pm_retention', '30')
        ->default('xelson-chat.settings.email_reminder_days', '0'),

    (new Extend\ThrottleApi())
        ->set('chat-message', ChatMessage::class),

    (new Extend\Event)->subscribe(PushChatEvents::class),
];
