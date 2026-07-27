<?php

namespace Xelson\Chat\Api\Controllers;

use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

/**
 * Lightweight user listing endpoint for chat user picker.
 * Accessible to any authenticated user (no searchUsers permission needed).
 * Returns basic user info: id, username, displayName, avatarUrl.
 */
class SearchChatUsersController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();  // Must be logged in to use chat

        $params = $request->getQueryParams();
        $q = trim(Arr::get($params, 'q', ''));
        $limit = min((int) Arr::get($params, 'limit', 200), 500);

        $query = \Flarum\User\User::query()
            ->whereVisibleTo($actor)
            ->orderBy('joined_at', 'desc')
            ->limit($limit);

        // Filter by search query (username or nickname/display name)
        if ($q !== '') {
            $query->where(function ($query) use ($q) {
                $query->where('username', 'like', '%' . addcslashes($q, '%_') . '%')
                      ->orWhere('nickname', 'like', '%' . addcslashes($q, '%_') . '%');
            });
        }

        $users = $query->get();

        // Build lightweight response — no full JSON:API serialization overhead
        $data = [];
        foreach ($users as $user) {
            // Skip self
            if ((int) $user->id === (int) $actor->id) {
                continue;
            }

            $data[] = [
                'type'       => 'users',
                'id'         => (string) $user->id,
                'attributes' => [
                    'username'    => $user->username,
                    'displayName' => $user->nickname ?: $user->username,
                    // Use the accessor so we get a full URL, not the raw
                    // relative filename stored in the avatar_url column.
                    'avatarUrl'   => $user->avatarUrl,
                ],
            ];
        }

        return new JsonResponse([
            'data' => $data,
            'meta' => [
                'total' => count($data),
                'query' => $q,
            ],
        ], 200, []);
    }
}
