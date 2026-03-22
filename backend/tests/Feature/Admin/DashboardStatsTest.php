<?php

namespace Tests\Feature\Admin;

use App\Models\Address;
use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_admin_can_view_dashboard_stats_for_ecommerce(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $category = Category::query()->create([
            'name' => 'Whole Beans',
            'slug' => 'whole-beans',
            'description' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $productA = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Midnight Roast',
            'slug' => 'midnight-roast',
            'short_description' => 'Bold roast',
            'description' => 'Bold roast',
            'price' => 520,
            'sale_price' => null,
            'sku' => 'BH-MR-001',
            'stock_quantity' => 4,
            'low_stock_threshold' => 5,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => true,
        ]);

        $productB = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Night Bloom',
            'slug' => 'night-bloom',
            'short_description' => 'Floral roast',
            'description' => 'Floral roast',
            'price' => 610,
            'sale_price' => null,
            'sku' => 'BH-NB-002',
            'stock_quantity' => 18,
            'low_stock_threshold' => 5,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $todayOrder = $this->createOrder($customer, $productA, [
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'confirmed',
            'total_amount' => 640,
            'created_at' => now(),
        ]);

        $this->createOrder($customer, $productB, [
            'payment_method' => 'gcash',
            'payment_status' => 'paid',
            'order_status' => 'delivered',
            'total_amount' => 730,
            'created_at' => now()->subMonth(),
        ], 3);

        $response = $this
            ->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/dashboard');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.today_orders', 1)
            ->assertJsonPath('data.low_stock_count', 1)
            ->assertJsonPath('data.total_products', 2)
            ->assertJsonCount(6, 'data.monthly_revenue_chart')
            ->assertJsonCount(2, 'data.top_products');

        $this->assertSame('Night Bloom', $response->json('data.top_products.0.product_name'));
        $this->assertCount(2, $response->json('data.recent_orders'));
        $this->assertContains($todayOrder->order_number, array_column($response->json('data.recent_orders'), 'order_number'));
    }

    protected function authHeaderFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->createToken('test-token')->plainTextToken,
        ];
    }

    protected function createAdmin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    protected function createCustomer(): User
    {
        $user = User::factory()->create();
        $user->assignRole('customer');

        return $user;
    }

    protected function createOrder(User $customer, Product $product, array $attributes = [], int $quantity = 2): Order
    {
        $address = Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Home',
            'recipient_name' => $customer->name,
            'phone' => $customer->phone ?? '09171234567',
            'street' => '123 Roast Street',
            'barangay' => 'Poblacion',
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
            'zip_code' => '8000',
            'is_default' => true,
        ]);

        $order = Order::query()->create(array_merge([
            'order_number' => 'BH-TEST-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'user_id' => $customer->id,
            'shipping_address_id' => $address->id,
            'subtotal' => 500,
            'shipping_fee' => 120,
            'discount_amount' => 0,
            'total_amount' => 620,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'pending',
        ], $attributes));

        if (isset($attributes['created_at']) || isset($attributes['updated_at'])) {
            $order->timestamps = false;
            $order->forceFill([
                'created_at' => $attributes['created_at'] ?? $order->created_at,
                'updated_at' => $attributes['updated_at'] ?? $order->updated_at,
            ])->save();
            $order->timestamps = true;
        }

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku,
            'quantity' => $quantity,
            'unit_price' => 250,
            'subtotal' => 250 * $quantity,
        ]);

        Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'paymongo_payment_intent_id' => null,
            'paymongo_source_id' => null,
            'method' => $order->payment_method,
            'amount' => $order->total_amount,
            'currency' => 'PHP',
            'status' => $order->payment_status === 'paid' ? 'paid' : 'pending',
            'paymongo_response' => null,
            'paid_at' => $order->payment_status === 'paid' ? now() : null,
        ]);

        return $order;
    }
}
