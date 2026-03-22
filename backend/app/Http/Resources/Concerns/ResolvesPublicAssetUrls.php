<?php

namespace App\Http\Resources\Concerns;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

trait ResolvesPublicAssetUrls
{
    protected function resolvePublicAssetUrl(?string $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        $request = request();

        if (Str::startsWith($path, '/storage/')) {
            $relativePath = ltrim(Str::after($path, '/storage/'), '/');

            if (! Storage::disk('public')->exists($relativePath)) {
                return null;
            }

            return $request
                ? rtrim($request->getSchemeAndHttpHost(), '/').'/storage/'.$relativePath
                : Storage::disk('public')->url($relativePath);
        }

        if (Str::startsWith($path, '/')) {
            return $request
                ? rtrim($request->getSchemeAndHttpHost(), '/').$path
                : $path;
        }

        $relativePath = ltrim($path, '/');

        if (! Storage::disk('public')->exists($relativePath)) {
            return null;
        }

        return $request
            ? rtrim($request->root(), '/').'/storage/'.$relativePath
            : Storage::disk('public')->url($relativePath);
    }
}
