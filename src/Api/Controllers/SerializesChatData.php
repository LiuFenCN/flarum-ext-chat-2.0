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

        $path = $request->getUri()->getPath();
        $newPath = rtrim(dirname($path), '/') . '/' . $model->id;

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
