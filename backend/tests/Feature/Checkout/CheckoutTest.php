<?php

namespace Tests\Feature\Checkout;

use App\Models\Address;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');

        config([
            'services.paymongo.public_key' => 'pk_test_checkout',
            'services.paymongo.secret_key' => 'sk_test_checkout',
            'services.paymongo.webhook_secret' => 'whsec_test_checkout',
            'services.paymongo.frontend_url' => 'http://localhost:5173',
        ]);
    }

    public function test_customer_can_place_a_cod_order_and_stock_is_deducted(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct([
            'price' => 850.00,
            'sale_price' => 790.00,
            'stock_quantity' => 8,
        ]);
        $address = $this->createAddress($customer, [
            'city' => 'Valencia City',
            'province' => 'Bukidnon',
        ]);

        $cart = Cart::query()->create([
            'user_id' => $customer->id,
            'session_id' => null,
        ]);
        $cart->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 850.00,
        ]);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/checkout', [
                'shipping_address_id' => $address->id,
                'payment_method' => 'cod',
                'notes' => 'Ring twice.',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Checkout initiated.')
            ->assertJsonPath('data.payment_method', 'cod')
            ->assertJsonPath('data.order_status', 'confirmed')
            ->assertJsonPath('data.payment_status', 'pending')
            ->assertJsonPath('data.checkout_url', null);

        $orderNumber = $response->json('data.order_number');
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'user_id' => $customer->id,
            'shipping_address_id' => $address->id,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 2,
            'unit_price' => 790.00,
            'subtotal' => 1580.00,
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'method' => 'cod',
            'amount' => 1580.00,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'type' => 'deduction',
            'quantity_change' => -2,
            'reference_id' => $order->id,
            'reference_type' => 'checkout',
            'created_by' => $customer->id,
        ]);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'pending',
            'changed_by' => $customer->id,
        ]);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'confirmed',
            'changed_by' => $customer->id,
        ]);

        $this->assertSame(6, (int) $product->fresh()->stock_quantity);
        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_customer_can_start_an_online_checkout_and_receive_a_paymongo_redirect(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/sources' => Http::response([
                'data' => [
                    'id' => 'src_test_123',
                    'attributes' => [
                        'redirect' => [
                            'checkout_url' => 'https://checkout.test/paymongo/src_test_123',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $customer = $this->createCustomer();
        $product = $this->createProduct([
            'price' => 650.00,
            'sale_price' => null,
            'stock_quantity' => 5,
        ]);
        $address = $this->createAddress($customer, [
            'city' => 'Davao City',
            'province' => 'Davao del Norte',
        ]);

        $cart = Cart::query()->create([
            'user_id' => $customer->id,
            'session_id' => null,
        ]);
        $cart->items()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 650.00,
        ]);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/checkout', [
                'shipping_address_id' => $address->id,
                'payment_method' => 'gcash',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_method', 'gcash')
            ->assertJsonPath('data.order_status', 'pending')
            ->assertJsonPath('data.payment_status', 'pending')
            ->assertJsonPath('data.checkout_url', 'https://checkout.test/paymongo/src_test_123');

        $order = Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();
        $payment = Payment::query()->where('order_id', $order->id)->firstOrFail();

        $this->assertNull($order->paymongo_payment_id);
        $this->assertSame('https://checkout.test/paymongo/src_test_123', $order->paymongo_checkout_url);
        $this->assertSame('awaiting_payment', $payment->status);
        $this->assertSame('src_test_123', $payment->paymongo_source_id);
        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_customer_can_start_a_paymaya_checkout_session_and_receive_a_paymongo_redirect(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions' => Http::response([
                'data' => [
                    'id' => 'cs_test_123',
                    'attributes' => [
                        'checkout_url' => 'https://checkout.test/paymongo/cs_test_123',
                        'payment_intent' => [
                            'id' => 'pi_test_123',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $customer = $this->createCustomer();
        $product = $this->createProduct([
            'price' => 650.00,
            'sale_price' => null,
            'stock_quantity' => 5,
        ]);
        $address = $this->createAddress($customer, [
            'city' => 'Davao City',
            'province' => 'Davao del Norte',
        ]);

        $cart = Cart::query()->create([
            'user_id' => $customer->id,
            'session_id' => null,
        ]);
        $cart->items()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 650.00,
        ]);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/checkout', [
                'shipping_address_id' => $address->id,
                'payment_method' => 'paymaya',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_method', 'paymaya')
            ->assertJsonPath('data.order_status', 'pending')
            ->assertJsonPath('data.payment_status', 'pending')
            ->assertJsonPath('data.checkout_url', 'https://checkout.test/paymongo/cs_test_123');

        $order = Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();
        $payment = Payment::query()->where('order_id', $order->id)->firstOrFail();

        $this->assertNull($order->paymongo_payment_id);
        $this->assertSame('https://checkout.test/paymongo/cs_test_123', $order->paymongo_checkout_url);
        $this->assertSame('awaiting_payment', $payment->status);
        $this->assertSame('pi_test_123', $payment->paymongo_payment_intent_id);
        $this->assertNull($payment->paymongo_source_id);
        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_checkout_order_lookup_can_reconcile_a_paymaya_payment_intent(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/payment_intents/pi_test_reconcile' => Http::response([
                'data' => [
                    'id' => 'pi_test_reconcile',
                    'attributes' => [
                        'status' => 'succeeded',
                        'payments' => [[
                            'id' => 'pay_test_reconcile',
                            'type' => 'payment',
                            'attributes' => [
                                'status' => 'paid',
                                'paid_at' => time(),
                            ],
                        ]],
                    ],
                ],
            ], 200),
        ]);

        $customer = $this->createCustomer();
        $product = $this->createProduct([
            'price' => 700.00,
            'sale_price' => null,
            'stock_quantity' => 4,
        ]);
        $address = $this->createAddress($customer, [
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
        ]);

        $order = Order::query()->create([
            'order_number' => 'BH-'.now()->year.'-90001',
            'user_id' => $customer->id,
            'rider_id' => null,
            'shipping_address_id' => $address->id,
            'subtotal' => 700.00,
            'shipping_fee' => 120.00,
            'discount_amount' => 0.00,
            'total_amount' => 820.00,
            'payment_method' => 'paymaya',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'paymongo_payment_id' => null,
            'paymongo_checkout_url' => 'https://checkout.test/paymongo/cs_test_reconcile',
            'notes' => null,
            'shipped_at' => null,
            'delivered_at' => null,
            'cancelled_at' => null,
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku,
            'quantity' => 2,
            'unit_price' => 350.00,
            'subtotal' => 700.00,
        ]);

        $order->statusLogs()->create([
            'order_status' => 'pending',
            'changed_by' => $customer->id,
            'note' => 'Awaiting payment.',
        ]);

        $product->decrement('stock_quantity', 2);

        $payment = Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'paymongo_payment_intent_id' => 'pi_test_reconcile',
            'paymongo_source_id' => null,
            'method' => 'paymaya',
            'amount' => 820.00,
            'currency' => 'PHP',
            'status' => 'awaiting_payment',
            'paymongo_response' => null,
            'paid_at' => null,
        ]);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->getJson('/api/v1/checkout/order/'.$order->order_number);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.order_status', 'confirmed');

        $this->assertSame('pay_test_reconcile', $order->fresh()->paymongo_payment_id);
        $this->assertSame('paid', $payment->fresh()->status);
    }

    public function test_customer_cannot_place_a_cod_order_outside_valencia(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct([
            'price' => 850.00,
            'sale_price' => 790.00,
            'stock_quantity' => 8,
        ]);
        $address = $this->createAddress($customer, [
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
        ]);

        $cart = Cart::query()->create([
            'user_id' => $customer->id,
            'session_id' => null,
        ]);
        $cart->items()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 850.00,
        ]);

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/checkout', [
                'shipping_address_id' => $address->id,
                'payment_method' => 'cod',
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Validation failed.')
            ->assertJsonPath('errors.payment_method.0', 'Cash on Delivery is currently limited to Valencia addresses only.');
    }

    protected function authHeaderFor(User $user): array
    {
        $token = $user->createToken('checkout-token')->plainTextToken;

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

    protected function createAddress(User $user, array $attributes = []): Address
    {
        return Address::query()->create(array_merge([
            'user_id' => $user->id,
            'label' => 'Home',
            'recipient_name' => $user->name,
            'phone' => '09171234567',
            'street' => '123 Roast Street',
            'barangay' => 'Poblacion',
            'city' => 'Valencia City',
            'province' => 'Bukidnon',
            'zip_code' => '8000',
            'is_default' => true,
        ], $attributes));
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
}
