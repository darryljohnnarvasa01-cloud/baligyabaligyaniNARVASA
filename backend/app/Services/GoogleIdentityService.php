<?php

namespace App\Services;

use Google\Client as GoogleClient;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class GoogleIdentityService
{
    /**
     * @return array{google_id:string,email:string,name:string,avatar_url:?string,email_verified:bool}
     */
    public function verifyCredential(string $credential): array
    {
        $clientId = trim((string) config('services.google.client_id'));

        if ($clientId === '') {
            throw ValidationException::withMessages([
                'google' => ['Google sign-in is not configured.'],
            ]);
        }

        $client = new GoogleClient([
            'client_id' => $clientId,
        ]);

        $payload = $client->verifyIdToken($credential);

        if (! is_array($payload)) {
            throw ValidationException::withMessages([
                'credential' => ['Google sign-in failed.'],
            ]);
        }

        return [
            'google_id' => trim((string) Arr::get($payload, 'sub', '')),
            'email' => strtolower(trim((string) Arr::get($payload, 'email', ''))),
            'name' => trim((string) Arr::get($payload, 'name', '')),
            'avatar_url' => Arr::get($payload, 'picture'),
            'email_verified' => (bool) Arr::get($payload, 'email_verified', false),
        ];
    }
}
