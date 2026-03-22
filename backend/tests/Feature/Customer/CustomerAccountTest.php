<?php

namespace Tests\Feature\Customer;

use App\Models\Address;
use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CustomerAccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_customer_can_view_profile_with_addresses(): void
    {
        $customer = $this->createCustomer();

        Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Home',
            'recipient_name' => $customer->name,
            'phone' => '09171234567',
            'street' => '12 Roast Street',
            'barangay' => 'Poblacion',
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
            'zip_code' => '8000',
            'is_default' => true,
        ]);

        Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Office',
            'recipient_name' => $customer->name,
            'phone' => '09179998888',
            'street' => '80 Espresso Avenue',
            'barangay' => 'Matina',
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
            'zip_code' => '8000',
            'is_default' => false,
        ]);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->getJson('/api/v1/customer/profile');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Customer profile retrieved.')
            ->assertJsonPath('data.user.email', $customer->email)
            ->assertJsonCount(2, 'data.addresses')
            ->assertJsonPath('data.addresses.0.is_default', true);
    }

    public function test_customer_can_update_profile(): void
    {
        $customer = $this->createCustomer();

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->putJson('/api/v1/customer/profile', [
                'name' => 'Updated Customer',
                'phone' => '09175554444',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Customer profile updated successfully.')
            ->assertJsonPath('data.user.name', 'Updated Customer')
            ->assertJsonPath('data.user.phone', '09175554444');
    }

    public function test_customer_can_list_and_view_order_history_by_order_number(): void
    {
        $customer = $this->createCustomer();
        $otherCustomer = $this->createCustomer();

        $firstOrder = $this->createOrderForCustomer($customer, [
            'order_number' => 'BH-2026-00011',
            'order_status' => 'pending',
            'payment_status' => 'pending',
        ]);

        $secondOrder = $this->createOrderForCustomer($customer, [
            'order_number' => 'BH-2026-00012',
            'order_status' => 'delivered',
            'payment_status' => 'paid',
        ]);

        $this->createOrderForCustomer($otherCustomer, [
            'order_number' => 'BH-2026-00099',
        ]);

        $indexResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->getJson('/api/v1/customer/orders?per_page=1');

        $indexResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.per_page', 1)
            ->assertJsonPath('data.meta.total', 2);

        $showResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->getJson('/api/v1/customer/orders/'.$secondOrder->order_number);

        $showResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Order retrieved.')
            ->assertJsonPath('data.order_number', $secondOrder->order_number)
            ->assertJsonPath('data.order_status', 'delivered')
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.customer.id', $customer->id)
            ->assertJsonPath('data.status_logs.0.order_status', 'pending');

        $this->assertNotSame($firstOrder->order_number, $showResponse->json('data.order_number'));
    }

    public function test_customer_can_cancel_a_pending_unpaid_order_and_restore_stock(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct([
            'stock_quantity' => 5,
        ]);

        $order = $this->createOrderForCustomer($customer, [
            'order_number' => 'BH-2026-00041',
            'order_status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'gcash',
        ], $product, 2);

        $product->decrement('stock_quantity', 2);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/customer/orders/'.$order->order_number.'/cancel');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Order cancelled successfully.')
            ->assertJsonPath('data.order_status', 'cancelled');

        $this->assertSame(5, (int) $product->fresh()->stock_quantity);

        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'type' => 'return',
            'reference_id' => $order->id,
            'created_by' => $customer->id,
        ]);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'cancelled',
            'changed_by' => $customer->id,
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'failed',
        ]);
    }

    public function test_customer_cannot_cancel_non_pending_or_paid_order(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct([
            'stock_quantity' => 3,
        ]);

        $order = $this->createOrderForCustomer($customer, [
            'order_number' => 'BH-2026-00042',
            'order_status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'gcash',
        ], $product, 1);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/customer/orders/'.$order->order_number.'/cancel');

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Only pending unpaid orders can be cancelled.');
    }

    protected function authHeaderFor(User $user): array
    {
        $token = $user->createToken('customer-account-token')->plainTextToken;

        return [
            'Authorization' => 'Bearer '.$token,
        ];
    }

    protected function createCustomer(): User
    {
        $user = User::factory()->create([
            'email' => 'customer'.uniqid().'@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        return $user;
    }

    protected function createProduct(array $attributes = []): Product
    {
        $category = Category::query()->create([
            'name' => 'Whole Beans '.uniqid(),
            'slug' => 'whole-beans-'.uniqid(),
            'description' => 'Premium beans.',
            'image' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        return Product::query()->create(array_merge([
            'category_id' => $category->id,
            'name' => 'Midnight Reserve '.uniqid(),
            'slug' => 'midnight-reserve-'.uniqid(),
            'short_description' => 'Dark and bold.',
            'description' => 'Detailed tasting notes.',
            'price' => 780.00,
            'sale_price' => null,
            'sku' => 'BH-'.strtoupper(substr(uniqid(), -6)),
            'stock_quantity' => 10,
            'low_stock_threshold' => 3,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ], $attributes));
    }

    protected function createOrderForCustomer(User $customer, array $attributes = [], ?Product $product = null, int $quantity = 1): Order
    {
        $address = Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Home',
            'recipient_name' => $customer->name,
            'phone' => '09171234567',
            'street' => '12 Roast Street',
            'barangay' => 'Poblacion',
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
            'zip_code' => '8000',
            'is_default' => true,
        ]);

        $product ??= $this->createProduct();
        $unitPrice = 390.00;
        $subtotal = $unitPrice * $quantity;
        $total = $subtotal + 120.00;

        $order = Order::query()->create(array_merge([
            'order_number' => 'BH-'.now()->year.'-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'user_id' => $customer->id,
            'rider_id' => null,
            'shipping_address_id' => $address->id,
            'subtotal' => $subtotal,
            'shipping_fee' => 120.00,
            'discount_amount' => 0.00,
            'total_amount' => $total,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'paymongo_payment_id' => null,
            'paymongo_checkout_url' => null,
            'notes' => null,
            'shipped_at' => null,
            'delivered_at' => null,
            'cancelled_at' => null,
        ], $attributes));

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'subtotal' => $subtotal,
        ]);

        $order->statusLogs()->create([
            'order_status' => 'pending',
            'changed_by' => $customer->id,
            'note' => 'Order created.',
        ]);

        if (($attributes['order_status'] ?? 'pending') !== 'pending') {
            $order->statusLogs()->create([
                'order_status' => $attributes['order_status'],
                'changed_by' => $customer->id,
                'note' => 'Order updated.',
            ]);
        }

        Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'paymongo_payment_intent_id' => null,
            'paymongo_source_id' => null,
            'method' => $attributes['payment_method'] ?? 'cod',
            'amount' => $total,
            'currency' => 'PHP',
            'status' => (($attributes['payment_status'] ?? 'pending') === 'paid') ? 'paid' : 'awaiting_payment',
            'paymongo_response' => null,
            'paid_at' => (($attributes['payment_status'] ?? 'pending') === 'paid') ? now() : null,
        ]);

        return $order;
    }
}
