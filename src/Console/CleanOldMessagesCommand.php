<?php

namespace Xelson\Chat\Console;

use Carbon\Carbon;
use Flarum\Console\AbstractCommand;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\ConnectionInterface;
use Xelson\Chat\Chat;
use Xelson\Chat\Message;

class CleanOldMessagesCommand extends AbstractCommand
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
            ->setName('chat:clean')
            ->setDescription('Delete chat messages older than the configured retention period.');
    }

    protected function fire(): int
    {
        $channelRetention = (int) $this->settings->get('xelson-chat.settings.channel_retention', 2);
        $pmRetention = (int) $this->settings->get('xelson-chat.settings.pm_retention', 30);

        if ($channelRetention <= 0 && $pmRetention <= 0) {
            $this->info('[chat] Message retention is set to permanent (0 days). Nothing to clean.');
            return 0;
        }

        $now = Carbon::now();
        $totalDeleted = 0;

        // Clean channel messages (type = 1)
        if ($channelRetention > 0) {
            $channelCutoff = $now->subDays($channelRetention);
            // Get channel chat IDs
            $channelIds = $this->db->table('neonchat_chats')->where('type', 1)->pluck('id')->toArray();

            if (!empty($channelIds)) {
                $count = Message::whereIn('chat_id', $channelIds)
                    ->where('created_at', '<', $channelCutoff)
                    ->delete();

                $totalDeleted += $count;
                $this->info("[chat] Deleted {$count} channel messages older than {$channelRetention} days.");
            }
        }

        // Clean PM messages (type = 0)
        if ($pmRetention > 0) {
            $pmCutoff = Carbon::now()->subDays($pmRetention);
            $pmIds = $this->db->table('neonchat_chats')->where('type', 0)->pluck('id')->toArray();

            if (!empty($pmIds)) {
                $count = Message::whereIn('chat_id', $pmIds)
                    ->where('created_at', '<', $pmCutoff)
                    ->delete();

                $totalDeleted += $count;
                $this->info("[chat] Deleted {$count} PM messages older than {$pmRetention} days.");
            }
        }

        if ($totalDeleted > 0) {
            $this->info("[chat] Cleanup complete. Total messages deleted: {$totalDeleted}");
        } else {
            $this->info("[chat] No expired messages found.");
        }

        return 0;
    }
}
