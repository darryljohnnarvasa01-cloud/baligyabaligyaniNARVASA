<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Auth\EmailVerificationNotificationRequest;
use App\Http\Requests\Auth\GoogleLoginRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\PasswordUpdateRequest;
use App\Http\Requests\Auth\ProfileUpdateRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Spatie\Permission\Models\Role;

class AuthController extends ApiController
{
    public function __construct(protected AuthService $authService)
    {
    }

    // [CODEX] E-commerce controller method: register
    // Model: User  Request: RegisterRequest  Resource: UserResource
    // PayMongo: no
    // Business rules: customer self-register only and return the new account payload using the standard API contract.
    // Returns: ApiController::success() or ::error()
    public function register(RegisterRequest $request): JsonResponse
    {
        Role::findOrCreate('customer', 'sanctum');

        $user = $this->authService->registerCustomer($request->validated());
        $user->sendEmailVerificationNotification();

        return $this->success([
            'user' => UserResource::make($user)->resolve($request),
            'role' => 'customer',
            'cart_count' => 0,
            'email_verification_required' => true,
        ], 'Registered successfully. Check your email to verify your account.', 201);
    }

    // [CODEX] E-commerce controller method: login
    // Model: User, Cart  Request: LoginRequest  Resource: UserResource
    // PayMongo: no
    // Business rules: validate credentials, reject inactive users, merge guest cart by session_id, create Sanctum token, and return merged cart_count.
    // Returns: ApiController::success() or ::error()
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->attemptLogin($request->validated());

        if ($result['status'] === 'invalid_credentials') {
            return $this->error('Invalid credentials.', [
                'email' => ['The provided credentials are incorrect.'],
            ], 422);
        }

        if ($result['status'] === 'inactive') {
            return $this->error('Account is inactive.', [], 403);
        }

        if ($result['status'] === 'unverified') {
            return response()->json([
                'success' => false,
                'message' => 'Email verification required.',
                'errors' => [
                    'email' => ['Verify your email before signing in.'],
                ],
                'data' => [
                    'verification_required' => true,
                    'email' => $result['user']?->email,
                ],
            ], 403);
        }

        return $this->success([
            'user' => UserResource::make($result['user'])->resolve($request),
            'token' => $result['token'],
            'role' => $result['role'],
            'cart_count' => $result['cart_count'],
        ], 'Login successful.');
    }

    // [CODEX] E-commerce controller method: googleLogin
    // Model: User, Cart  Request: GoogleLoginRequest  Resource: UserResource
    // PayMongo: no
    // Business rules: verify a Google ID token, create or link the account, merge guest cart by session_id, create Sanctum token, and return the standard auth payload.
    // Returns: ApiController::success() or ::error()
    public function googleLogin(GoogleLoginRequest $request): JsonResponse
    {
        $result = $this->authService->attemptGoogleLogin($request->validated());

        if ($result['status'] === 'invalid_google') {
            return $this->error('Google sign-in failed.', [
                'credential' => ['The Google credential could not be verified.'],
            ], 422);
        }

        if ($result['status'] === 'google_email_unverified') {
            return $this->error('Google account email is not verified.', [
                'email' => ['Verify your Google account email before signing in.'],
            ], 403);
        }

        if ($result['status'] === 'google_conflict') {
            return $this->error('This email is already linked to a different Google account.', [
                'email' => ['Use the original Google account for this email.'],
            ], 409);
        }

        if ($result['status'] === 'inactive') {
            return $this->error('Account is inactive.', [], 403);
        }

        return $this->success([
            'user' => UserResource::make($result['user'])->resolve($request),
            'token' => $result['token'],
            'role' => $result['role'],
            'cart_count' => $result['cart_count'],
        ], 'Google sign-in successful.');
    }

    // [CODEX] E-commerce controller method: logout
    // Model: User  Request: Request  Resource: none
    // PayMongo: no
    // Business rules: revoke only the current Sanctum token.
    // Returns: ApiController::success() or ::error()
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out successfully.');
    }

    // [CODEX] E-commerce controller method: me
    // Model: User, Cart  Request: Request  Resource: UserResource
    // PayMongo: no
    // Business rules: return the authenticated user, primary role, and current cart item count.
    // Returns: ApiController::success() or ::error()
    public function me(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $user->loadMissing('roles');

        return $this->success([
            'user' => UserResource::make($user)->resolve($request),
            'role' => $user->role,
            'cart_count' => $this->authService->getCartCountForUser($user),
        ], 'Authenticated user retrieved.');
    }

    // [CODEX] E-commerce controller method: updateProfile
    // Model: User  Request: ProfileUpdateRequest  Resource: UserResource
    // PayMongo: no
    // Business rules: allow name, phone, and avatar updates while preserving the standard auth response payload.
    // Returns: ApiController::success() or ::error()
    public function updateProfile(ProfileUpdateRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $user = $this->authService->updateProfile($user, $request->validated());

        return $this->success([
            'user' => UserResource::make($user)->resolve($request),
            'role' => $user->role,
            'cart_count' => $this->authService->getCartCountForUser($user),
        ], 'Profile updated successfully.');
    }

    // [CODEX] E-commerce controller method: updatePassword
    // Model: User  Request: PasswordUpdateRequest  Resource: none
    // PayMongo: no
    // Business rules: require the current password before saving the new password hash.
    // Returns: ApiController::success() or ::error()
    public function updatePassword(PasswordUpdateRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        if (! $this->authService->changePassword($user, $request->validated())) {
            return $this->error('Current password is incorrect.', [
                'current_password' => ['The provided current password is incorrect.'],
            ], 422);
        }

        return $this->success(null, 'Password updated successfully.');
    }

    public function sendVerificationNotification(EmailVerificationNotificationRequest $request): JsonResponse
    {
        $email = (string) $request->validated('email');
        $this->authService->sendVerificationNotification($email);

        return $this->success([
            'email' => $email,
        ], 'If an account exists for that email, a verification link has been sent.');
    }

    public function verifyEmail(Request $request, string $id, string $hash): RedirectResponse
    {
        /** @var User|null $user */
        $user = User::query()->find($id);

        if (! $user || ! URL::hasValidSignature($request)) {
            return redirect()->away($this->verificationRedirectUrl('invalid'));
        }

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return redirect()->away($this->verificationRedirectUrl('invalid'));
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->away($this->verificationRedirectUrl('already_verified', $user->email));
        }

        $user->markEmailAsVerified();

        return redirect()->away($this->verificationRedirectUrl('verified', $user->email));
    }

    protected function verificationRedirectUrl(string $status, ?string $email = null): string
    {
        $frontendUrl = rtrim((string) config('services.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
        $query = http_build_query(array_filter([
            'status' => $status,
            'email' => $email,
        ]));

        return $frontendUrl.'/verify-email'.($query !== '' ? '?'.$query : '');
    }
}
