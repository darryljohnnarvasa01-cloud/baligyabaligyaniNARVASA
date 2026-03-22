<?php

namespace Tests\Feature\Admin;

use App\Models\Address;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminOrdersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_admin_can_list_filter_update_and_assign_orders(): void
    {
        $admin = $this->createUserWithRole('admin');
        $customer = $this->createUserWithRole('customer');
        $rider = $this->createUserWithRole('rider');
        $secondRider = $this->createUserWithRole('rider');
        $product = $this->createProduct();

        $pending = $this->createOrder($customer, $product, [
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
        ]);

        $packed = $this->createOrder($customer, $product, [
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'packed',
            'rider_id' => $rider->id,
        ]);

        $outForDelivery = $this->createOrder($customer, $product, [
            'payment_method' => 'paymaya',
            'payment_status' => 'paid',
            'order_status' => 'out_for_delivery',
            'rider_id' => $secondRider->id,
        ]);

        $this->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/orders?status=pending&payment_status=pending&method=gcash')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.items.0.order_number', $pending->order_number);

        $this->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/riders/available')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $rider->id);

        $this->withHeaders($this->authHeaderFor($admin))
            ->patchJson('/api/v1/admin/orders/'.$pending->id.'/status', [
                'order_status' => 'processing',
                'note' => 'Started roasting.',
            ])
            ->assertOk()
            ->assertJsonPath('data.order_status', 'processing');

        $this->withHeaders($this->authHeaderFor($admin))
            ->patchJson('/api/v1/admin/orders/'.$packed->id.'/assign', [
                'rider_id' => $rider->id,
                'note' => 'Hand off after packing.',
            ])
            ->assertOk()
            ->assertJsonPath('data.rider_id', $rider->id);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $pending->id,
            'order_status' => 'processing',
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $packed->id,
            'rider_id' => $rider->id,
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $outForDelivery->id,
            'rider_id' => $secondRider->id,
            'order_status' => 'out_for_delivery',
        ]);
    }

    protected function authHeaderFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->createToken('test-token')->plainTextToken,
        ];
    }

    protected function createUserWithRole(string $role): User
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole($role);

        return $user;
    }

    protected function createProduct(): Product
    {
        $category = Category::query()->create([
            'name' => 'Ground Coffee',
            'slug' => 'ground-coffee',
            'description' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Dark Matter',
            'slug' => 'dark-matter',
            'short_description' => 'Dark roast',
            'description' => 'Dark roast',
            'price' => 480,
            'sale_price' => null,
            'sku' => 'BH-DM-001',
            'stock_quantity' => 20,
            'low_stock_threshold' => 5,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);
    }

    protected function createOrder(User $customer, Product $product, array $overrides): Order
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
            'order_number' => 'BH-ORD-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'user_id' => $customer->id,
            'shipping_address_id' => $address->id,
            'subtotal' => 480,
            'shipping_fee' => 120,
            'discount_amount' => 0,
            'total_amount' => 600,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'pending',
        ], $overrides));

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku,
            'quantity' => 1,
            'unit_price' => 480,
            'subtotal' => 480,
        ]);

        Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'paymongo_payment_intent_id' => null,
            'paymongo_source_id' => null,
            'method' => $order->payment_method,
            'amount' => $order->total_amount,
            'currency' => 'PHP',
            'status' => 'pending',
            'paymongo_response' => null,
            'paid_at' => null,
        ]);

        return $order;
    }
}
