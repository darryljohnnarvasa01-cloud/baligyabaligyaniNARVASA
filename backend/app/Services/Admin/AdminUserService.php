<?php

namespace App\Services\Admin;

use App\Models\User;
use Spatie\Permission\Models\Role;

class AdminUserService
{
    /**
     * @param  array{name:string,email:string,phone?:string|null,password:string,is_active?:bool|null}  $payload
     */
    public function createRider(array $payload): User
    {
        Role::findOrCreate('rider', 'sanctum');

        /** @var User $user */
        $user = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'phone' => $payload['phone'] ?? null,
            'avatar' => null,
            'is_active' => (bool) ($payload['is_active'] ?? true),
            'email_verified_at' => now(),
            'password' => $payload['password'],
        ]);

        $user->syncRoles(['rider']);

        return $user->fresh(['roles']);
    }
}
