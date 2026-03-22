<?php

namespace Tests\Feature\Auth;

use App\Models\Cart;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\GoogleIdentityService;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');

        config([
            'services.frontend_url' => 'http://localhost:5173',
        ]);
    }

    public function test_customer_can_register(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test Customer',
            'email' => 'customer@example.com',
            'phone' => '09171234567',
            'password' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Registered successfully. Check your email to verify your account.')
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.cart_count', 0)
            ->assertJsonPath('data.user.email', 'customer@example.com')
            ->assertJsonPath('data.email_verification_required', true);

        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.com',
            'name' => 'Test Customer',
        ]);

        $user = User::query()->where('email', 'customer@example.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        $this->assertSame(['customer'], $user->getRoleNames()->all());
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_login_is_rejected_for_invalid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'wrong-password',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Invalid credentials.');
    }

    public function test_login_merges_guest_cart_and_returns_cart_count(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        $category = Category::query()->create([
            'name' => 'Whole Beans',
            'slug' => 'whole-beans',
            'description' => 'Beans',
            'image' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Midnight Reserve Blend',
            'slug' => 'midnight-reserve-blend',
            'short_description' => 'Dark roast',
            'description' => 'Dark roast coffee.',
            'price' => 780.00,
            'sale_price' => 720.00,
            'sku' => 'BH-WB-001',
            'stock_quantity' => 8,
            'low_stock_threshold' => 3,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $userCart = Cart::query()->create([
            'user_id' => $user->id,
            'session_id' => null,
        ]);
        $userCart->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 780.00,
        ]);

        $guestCart = Cart::query()->create([
            'user_id' => null,
            'session_id' => 'guest-session-123',
        ]);
        $guestCart->items()->create([
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 780.00,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password123',
            'session_id' => 'guest-session-123',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Login successful.')
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.cart_count', 5);

        $this->assertDatabaseMissing('carts', ['id' => $guestCart->id]);
        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $userCart->id,
            'product_id' => $product->id,
            'quantity' => 5,
            'unit_price' => 720.00,
        ]);
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_unverified_customer_cannot_log_in_until_email_is_verified(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Email verification required.')
            ->assertJsonPath('data.verification_required', true)
            ->assertJsonPath('data.email', 'customer@example.com');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_google_login_creates_a_verified_customer_account(): void
    {
        $this->mock(GoogleIdentityService::class, function ($mock): void {
            $mock->shouldReceive('verifyCredential')
                ->once()
                ->with('google-credential-123')
                ->andReturn([
                    'google_id' => 'google-sub-123',
                    'email' => 'google.customer@example.com',
                    'name' => 'Google Customer',
                    'avatar_url' => 'https://example.com/avatar.jpg',
                    'email_verified' => true,
                ]);
        });

        $response = $this->postJson('/api/v1/auth/google', [
            'credential' => 'google-credential-123',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Google sign-in successful.')
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.user.email', 'google.customer@example.com')
            ->assertJsonPath('data.user.auth_provider', 'google')
            ->assertJsonPath('data.user.has_verified_email', true);

        $this->assertDatabaseHas('users', [
            'email' => 'google.customer@example.com',
            'google_id' => 'google-sub-123',
            'auth_provider' => 'google',
        ]);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_google_login_links_existing_customer_marks_it_verified_and_merges_guest_cart(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        $category = Category::query()->create([
            'name' => 'Whole Beans',
            'slug' => 'whole-beans',
            'description' => 'Beans',
            'image' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Morning Bloom',
            'slug' => 'morning-bloom',
            'short_description' => 'Medium roast',
            'description' => 'Medium roast coffee.',
            'price' => 650.00,
            'sale_price' => null,
            'sku' => 'BH-WB-099',
            'stock_quantity' => 9,
            'low_stock_threshold' => 3,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $guestCart = Cart::query()->create([
            'user_id' => null,
            'session_id' => 'guest-google-session',
        ]);
        $guestCart->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 650.00,
        ]);

        $this->mock(GoogleIdentityService::class, function ($mock): void {
            $mock->shouldReceive('verifyCredential')
                ->once()
                ->with('google-credential-456')
                ->andReturn([
                    'google_id' => 'google-sub-456',
                    'email' => 'customer@example.com',
                    'name' => 'Customer Example',
                    'avatar_url' => 'https://example.com/customer.jpg',
                    'email_verified' => true,
                ]);
        });

        $response = $this->postJson('/api/v1/auth/google', [
            'credential' => 'google-credential-456',
            'session_id' => 'guest-google-session',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.cart_count', 2)
            ->assertJsonPath('data.user.email', 'customer@example.com')
            ->assertJsonPath('data.user.has_verified_email', true);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'google_id' => 'google-sub-456',
            'auth_provider' => 'google',
        ]);
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertDatabaseMissing('carts', ['id' => $guestCart->id]);
    }

    public function test_unverified_customer_can_request_a_new_verification_email(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create([
            'email' => 'customer@example.com',
        ]);
        $user->assignRole('customer');

        $response = $this->postJson('/api/v1/auth/email/verification-notification', [
            'email' => 'customer@example.com',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'customer@example.com');

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_customer_can_verify_email_from_signed_link(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'customer@example.com',
        ]);
        $user->assignRole('customer');

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $response = $this->get($verificationUrl);

        $response->assertRedirect('http://localhost:5173/verify-email?status=verified&email=customer%40example.com');
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_authenticated_user_can_fetch_profile_with_cart_count(): void
    {
        $user = User::factory()->create([
            'email' => 'rider@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('rider');

        $category = Category::query()->create([
            'name' => 'Merchandise',
            'slug' => 'merchandise',
            'description' => 'Merch',
            'image' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'BrewHaus Enamel Mug',
            'slug' => 'brewhaus-enamel-mug',
            'short_description' => 'Enamel mug',
            'description' => 'Durable enamel mug.',
            'price' => 540.00,
            'sale_price' => null,
            'sku' => 'BH-MR-001',
            'stock_quantity' => 12,
            'low_stock_threshold' => 3,
            'weight_grams' => 300,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $cart = Cart::query()->create([
            'user_id' => $user->id,
            'session_id' => null,
        ]);
        $cart->items()->createMany([
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 540.00],
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'rider@example.com')
            ->assertJsonPath('data.role', 'rider')
            ->assertJsonPath('data.cart_count', 1);
    }

    public function test_authenticated_user_can_update_profile_and_password(): void
    {
        $user = User::factory()->create([
            'name' => 'Original Name',
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        $token = $user->createToken('test-token')->plainTextToken;

        $profileResponse = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/auth/profile', [
                'name' => 'Updated Name',
                'phone' => '09179998888',
            ]);

        $profileResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.name', 'Updated Name')
            ->assertJsonPath('data.user.phone', '09179998888');

        $passwordResponse = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'password123',
                'new_password' => 'newpassword123',
            ]);

        $passwordResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Password updated successfully.');

        $this->assertTrue(password_verify('newpassword123', $user->fresh()->password));
    }

    public function test_logout_revokes_only_current_token(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        $currentToken = $user->createToken('current-token')->plainTextToken;
        $otherToken = $user->createToken('other-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$currentToken)
            ->postJson('/api/v1/auth/logout');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Logged out successfully.');

        $this->assertNull(PersonalAccessToken::findToken($currentToken));
        $this->assertNotNull(PersonalAccessToken::findToken($otherToken));
    }
}
