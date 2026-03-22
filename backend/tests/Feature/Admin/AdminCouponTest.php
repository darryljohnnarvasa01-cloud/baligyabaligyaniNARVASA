<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminCouponTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_admin_can_list_create_update_and_delete_coupons(): void
    {
        $admin = $this->createAdmin();

        $createResponse = $this
            ->withHeaders($this->authHeaderFor($admin))
            ->postJson('/api/v1/admin/coupons', [
                'code' => 'MIDNIGHT10',
                'type' => 'percent',
                'value' => 10,
                'min_order_amount' => 999,
                'usage_limit' => 50,
                'expires_at' => now()->addWeek()->toISOString(),
                'is_active' => true,
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.code', 'MIDNIGHT10');

        $couponId = (int) $createResponse->json('data.id');

        $this
            ->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/coupons')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');

        $this
            ->withHeaders($this->authHeaderFor($admin))
            ->putJson('/api/v1/admin/coupons/'.$couponId, [
                'code' => 'MIDNIGHT15',
                'type' => 'percent',
                'value' => 15,
                'min_order_amount' => 1299,
                'usage_limit' => 40,
                'expires_at' => now()->addDays(10)->toISOString(),
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.code', 'MIDNIGHT15')
            ->assertJsonPath('data.is_active', false);

        $this
            ->withHeaders($this->authHeaderFor($admin))
            ->deleteJson('/api/v1/admin/coupons/'.$couponId)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('coupons', [
            'id' => $couponId,
        ]);
    }

    protected function createAdmin(): User
    {
        $user = User::factory()->create([
            'email' => 'admin'.uniqid().'@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('admin');

        return $user;
    }

    protected function authHeaderFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->createToken('admin-coupon-token')->plainTextToken,
        ];
    }
}
