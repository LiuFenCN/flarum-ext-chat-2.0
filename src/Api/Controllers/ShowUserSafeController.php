<?php

namespace Xelson\Chat\Api\Controllers;

use Flarum\Api\JsonApi;
use Flarum\Api\Resource\UserResource;
use Flarum\Http\RequestUtil;
use Flarum\User\UserRepository;
use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ShowUserSafeController implements RequestHandlerInterface
{
    protected JsonApi $api;

    public function __construct(JsonApi $api, UserRepository $users)
    {
        $this->api = $api;
        $this->users = $users;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $id = Arr::get($request->getQueryParams(), 'id');
        $actor = RequestUtil::getActor($request);

        if (! is_numeric($id)) {
            $id = $this->users->getIdForUsername($id);
        }

        $user = $this->users->query()
            ->where('id', $id)
            ->whereVisibleTo($actor)
            ->first();

        if (! $user) {
            throw new NotFoundHttpException('User not found');
        }

        // Serialize through the core `users` resource show endpoint.
        $path = $request->getUri()->getPath();
        $segments = explode('/', trim($path, '/'));
        $apiIndex = array_search('api', $segments);
        $base = $apiIndex !== false ? '/' . implode('/', array_slice($segments, 0, $apiIndex + 1)) : '';
        $newPath = $base . '/users/' . $user->id;

        $uri = $request->getUri()
            ->withPath($newPath)
            ->withQuery($request->getUri()->getQuery());

        $showRequest = $request->withMethod('GET')->withUri($uri);

        return $this->api
            ->forResource(UserResource::class)
            ->forEndpoint('show')
            ->handle($showRequest);
    }
}
