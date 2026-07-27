<?php

namespace Xelson\Chat\Console;

use Carbon\Carbon;
use Flarum\Console\AbstractCommand;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Mail\Job\SendEmailJob;
use Flarum\User\User;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\Queue;

class UnreadReminderCommand extends AbstractCommand
{
    protected ConnectionInterface $db;
    protected SettingsRepositoryInterface $settings;

    public function __construct(ConnectionInterface $db, SettingsRepositoryInterface $settings)
    {
        parent::__construct();
        $this->db = $db;
        $this->settings = $settings;
    }

    protected function configure()
    {
        $this
            ->setName('chat:unread-reminder')
            ->setDescription('Send email reminders for unread forum posts and chat messages.');
    }

    protected function fire(): int
    {
        $reminderDays = (int) $this->settings->get('xelson-chat.settings.email_reminder_days', 0);

        if ($reminderDays <= 0) {
            $this->info('[chat] Email reminder is disabled (set to 0 days).');
            return 0;
        }

        $cutoff = Carbon::now()->subDays($reminderDays);
        $reminded = 0;

        // Find users with unread discussions (posts after their read_time)
        $usersWithUnreadDiscussions = $this->db->table('discussion_user as du')
            ->join('discussions as d', 'd.id', '=', 'du.discussion_id')
            ->join('posts as p', 'p.discussion_id', '=', 'd.id')
            ->where('du.user_id', '!=', 1) // exclude guest/admin system user
            ->where(function ($q) use ($cutoff) {
                $q->whereNull('du.read_time')
                  ->orWhere('du.read_time', '<', $cutoff);
            })
            ->where('p.created_at', '>', $cutoff)
            ->where('p.number', '=', 1) // only count OP for simplicity
            ->select('du.user_id')
            ->distinct()
            ->pluck('du.user_id')
            ->toArray();

        // Find users with unread chat messages
        $usersWithUnreadChat = $this->db->table('neonchat_chat_user as cu')
            ->join('neonchat_messages as m', 'm.chat_id', '=', 'cu.chat_id')
            ->where('cu.removed_at', null)
            ->where(function ($q) use ($cutoff) {
                $q->whereNull('cu.readed_at')
                  ->orWhere('cu.readed_at', '<', $cutoff);
            })
            ->where('m.created_at', '>', $cutoff)
            ->where('m.type', 0) // only regular messages, not events
            ->select('cu.user_id')
            ->distinct()
            ->pluck('cu.user_id')
            ->toArray();

        // Merge and dedupe
        $userIds = array_unique(array_merge($usersWithUnreadDiscussions, $usersWithUnreadChat));

        if (empty($userIds)) {
            $this->info('[chat] No users with unread items older than ' . $reminderDays . ' days.');
            return 0;
        }

        foreach ($userIds as $userId) {
            $user = User::find($userId);
            if (!$user || !$user->is_activated || $user->email === null) continue;

            // Check if user has been reminded recently (within the reminder period) to avoid spam
            $lastRemindKey = 'xelson-chat_last_reminder_at';
            $lastRemindAt = $user->getPreference($lastRemindKey);
            if ($lastRemindAt && Carbon::parse($lastRemindAt)->gt($cutoff)) {
                continue;
            }

            try {
                Queue::push(new SendEmailJob([
                    'to' => [$user->email => $user->display_name],
                    'subject' => app('flarum.translator')->trans('xelson-chat.admin.email_reminder.subject'),
                    'body' => $this->buildEmailBody($user, $reminderDays),
                ]));

                // Update last reminder time preference
                $user->setPreference($lastRemindKey, Carbon::now()->toDateTimeString());
                $user->save();

                $reminded++;
            } catch (\Exception $e) {
                $this->error("[chat] Failed to send reminder to user {$userId}: " . $e->getMessage());
            }
        }

        $this->info("[chat] Sent {$reminded} unread reminders (older than {$reminderDays} days).");
        return 0;
    }

    protected function buildEmailBody(User $user, int $days): string
    {
        $forumUrl = app('flarum.url');
        $translator = app('flarum.translator');

        return $translator->trans('xelson-chat.admin.email_reminder.body', [
            '{username}' => $user->display_name,
            '{days}' => $days,
            '{forum_url}' => $forumUrl,
        ]);
    }
}
