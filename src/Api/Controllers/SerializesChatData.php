<?php

namespace Xelson\Chat\Api\Controllers;

use Flarum\Api\JsonApi;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Helper for controllers that compute a model and then want it serialized
 * through the matching Flarum 2.0 API resource (the same mechanism
 * ShowForumController uses). We re-point the request at the resource's
 * `show` endpoint for the model's type and id.
 */
trait SerializesChatData
{
    protected JsonApi $api;

    protected function serializeModel(ServerRequestInterface $request, string $resourceClass, object $model): ResponseInterface
    {
        $resource = $this->api->getResource($resourceClass);
        $type = $resource->type();

        // Build correct show path: /api/<type>/<id>
        // dirname('/api/chatmessages/0') = '/api/chatmessages' → OK
        // dirname('/api/chats') = '/api' → WRONG; use type instead
        $path = $request->getUri()->getPath();
        $dir = rtrim(dirname($path), '/');
        // If dirname lost the type segment (single-segment route like /chats),
        // reconstruct from the resource type.
        if (!str_ends_with($dir, $type)) {
            $dir .= '/' . $type;
        }
        $newPath = $dir . '/' . $model->id;

        $uri = $request->getUri()
            ->withPath($newPath)
            ->withQuery($request->getUri()->getQuery());

        $showRequest = $request
            ->withMethod('GET')
            ->withUri($uri);

        return $this->api
            ->forResource($resourceClass)
            ->forEndpoint('show')
            ->handle($showRequest);
    }
}
