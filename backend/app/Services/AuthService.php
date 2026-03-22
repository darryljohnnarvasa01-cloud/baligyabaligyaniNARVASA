<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthService
{
    public function __construct(
        protected CartService $cartService,
        protected GoogleIdentityService $googleIdentityService,
    )
    {
    }

    /**
     * Register a self-service customer account.
     *
     * @param  array<string, mixed>  $payload
     */
    public function registerCustomer(array $payload): User
    {
        /** @var User $user */
        $user = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'phone' => $payload['phone'] ?? null,
            'avatar' => null,
            'is_active' => true,
            'email_verified_at' => null,
            'password' => $payload['password'],
        ]);

        $user->syncRoles(['customer']);

        return $user->fresh('roles');
    }

    /**
     * Attempt to authenticate the user and merge any guest cart.
     *
     * @param  array<string, mixed>  $payload
     * @return array{status:string,user:?User,token:?string,role:?string,cart_count:int}
     */
    public function attemptLogin(array $payload): array
    {
        /** @var User|null $candidate */
        $candidate = User::query()
            ->where('email', $payload['email'])
            ->first();

        if (! $candidate || ! Hash::check($payload['password'], $candidate->password)) {
            return [
                'status' => 'invalid_credentials',
                'user' => null,
                'token' => null,
                'role' => null,
                'cart_count' => 0,
            ];
        }

        if (! $candidate->is_active) {
            return [
                'status' => 'inactive',
                'user' => $candidate,
                'token' => null,
                'role' => $this->resolveRole($candidate),
                'cart_count' => 0,
            ];
        }

        if ($this->requiresEmailVerification($candidate)) {
            return [
                'status' => 'unverified',
                'user' => $candidate,
                'token' => null,
                'role' => $this->resolveRole($candidate),
                'cart_count' => 0,
            ];
        }

        /** @var array{user:User,cart_count:int} $result */
        $result = DB::transaction(function () use ($candidate, $payload): array {
            /** @var User $user */
            $user = User::query()
                ->with('roles')
                ->lockForUpdate()
                ->findOrFail($candidate->id);

            $cartCount = $this->mergeGuestCart($user, Arr::get($payload, 'session_id'));

            return [
                'user' => $user->fresh('roles'),
                'cart_count' => $cartCount,
            ];
        });

        $token = $result['user']->createToken('brewhaus-spa')->plainTextToken;

        return [
            'status' => 'authenticated',
            'user' => $result['user'],
            'token' => $token,
            'role' => $this->resolveRole($result['user']),
            'cart_count' => $result['cart_count'],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{status:string,user:?User,token:?string,role:?string,cart_count:int}
     */
    public function attemptGoogleLogin(array $payload): array
    {
        $identity = $this->googleIdentityService->verifyCredential((string) $payload['credential']);

        if ($identity['google_id'] === '' || $identity['email'] === '') {
            return [
                'status' => 'invalid_google',
                'user' => null,
                'token' => null,
                'role' => null,
                'cart_count' => 0,
            ];
        }

        if (! $identity['email_verified']) {
            return [
                'status' => 'google_email_unverified',
                'user' => null,
                'token' => null,
                'role' => null,
                'cart_count' => 0,
            ];
        }

        /** @var array{status:string,user:User,cart_count:int} $result */
        $result = DB::transaction(function () use ($identity, $payload): array {
            /** @var User|null $user */
            $user = User::query()
                ->with('roles')
                ->lockForUpdate()
                ->where('google_id', $identity['google_id'])
                ->orWhere('email', $identity['email'])
                ->first();

            if ($user && $user->google_id && $user->google_id !== $identity['google_id']) {
                return [
                    'status' => 'google_conflict',
                    'user' => $user,
                    'cart_count' => 0,
                ];
            }

            if ($user && ! $user->is_active) {
                return [
                    'status' => 'inactive',
                    'user' => $user,
                    'cart_count' => 0,
                ];
            }

            if (! $user) {
                /** @var User $user */
                $user = User::query()->create([
                    'name' => $identity['name'] !== '' ? $identity['name'] : 'Google User',
                    'email' => $identity['email'],
                    'google_id' => $identity['google_id'],
                    'phone' => null,
                    'avatar' => null,
                    'auth_provider' => 'google',
                    'provider_avatar' => $identity['avatar_url'],
                    'is_active' => true,
                    'email_verified_at' => Carbon::now(),
                    'password' => Str::password(32),
                ]);

                $user->syncRoles(['customer']);
            } else {
                $attributes = [
                    'google_id' => $identity['google_id'],
                    'auth_provider' => 'google',
                    'provider_avatar' => $identity['avatar_url'],
                ];

                if (! $user->hasVerifiedEmail()) {
                    $attributes['email_verified_at'] = Carbon::now();
                }

                $user->forceFill($attributes)->save();
            }

            $cartCount = $this->mergeGuestCart($user, Arr::get($payload, 'session_id'));
            $freshUser = $user->fresh('roles');

            return [
                'status' => 'authenticated',
                'user' => $freshUser,
                'cart_count' => $cartCount,
            ];
        });

        if ($result['status'] !== 'authenticated') {
            return [
                'status' => $result['status'],
                'user' => $result['user'],
                'token' => null,
                'role' => $this->resolveRole($result['user']),
                'cart_count' => $result['cart_count'],
            ];
        }

        $token = $result['user']->createToken('brewhaus-spa')->plainTextToken;

        return [
            'status' => 'authenticated',
            'user' => $result['user'],
            'token' => $token,
            'role' => $this->resolveRole($result['user']),
            'cart_count' => $result['cart_count'],
        ];
    }

    public function sendVerificationNotification(string $email): void
    {
        /** @var User|null $user */
        $user = User::query()
            ->where('email', $email)
            ->first();

        if (! $user || $user->hasVerifiedEmail()) {
            return;
        }

        $user->sendEmailVerificationNotification();
    }

    public function getCartCountForUser(User $user): int
    {
        $user->loadMissing('cart.items');

        return (int) ($user->cart?->items?->sum('quantity') ?? 0);
    }

    /**
     * Update the authenticated user's profile.
     *
     * @param  array<string, mixed>  $payload
     */
    public function updateProfile(User $user, array $payload): User
    {
        $attributes = Arr::only($payload, ['name', 'phone']);

        if (array_key_exists('avatar', $payload) && $payload['avatar'] instanceof UploadedFile) {
            $attributes['avatar'] = $this->storeAvatar($user, $payload['avatar']);
        }

        if (! empty($attributes)) {
            $user->fill($attributes)->save();
        }

        return $user->fresh('roles');
    }

    /**
     * Change the authenticated user's password.
     *
     * @param  array<string, mixed>  $payload
     */
    public function changePassword(User $user, array $payload): bool
    {
        if (! Hash::check($payload['current_password'], $user->password)) {
            return false;
        }

        $user->forceFill([
            'password' => $payload['new_password'],
        ])->save();

        return true;
    }

    protected function resolveRole(?User $user): ?string
    {
        return $user?->getRoleNames()->first() ?? null;
    }

    protected function requiresEmailVerification(User $user): bool
    {
        return $this->resolveRole($user) === 'customer' && ! $user->hasVerifiedEmail();
    }

    protected function resolveUnitPrice(Product $product): string
    {
        return $this->cartService->currentUnitPrice($product);
    }

    protected function mergeGuestCart(User $user, mixed $sessionId): int
    {
        return $this->cartService->mergeGuestCartIntoUser(
            $user,
            is_string($sessionId) ? $sessionId : null
        );
    }

    protected function storeAvatar(User $user, UploadedFile $avatar): string
    {
        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        return $avatar->store('avatars/'.$user->id, 'public');
    }
}
