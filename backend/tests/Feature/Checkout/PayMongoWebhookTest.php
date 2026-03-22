<?php

namespace Tests\Feature\Checkout;

use App\Models\Address;
use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PayMongoWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');

        config([
            'services.paymongo.public_key' => 'pk_test_webhook',
            'services.paymongo.secret_key' => 'sk_test_webhook',
            'services.paymongo.webhook_secret' => 'whsec_test_webhook',
            'services.paymongo.frontend_url' => 'http://localhost:5173',
        ]);
    }

    public function test_source_chargeable_creates_a_paymongo_payment_record_link(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/payments' => Http::response([
                'data' => [
                    'id' => 'pay_test_123',
                ],
            ], 200),
        ]);

        [$order] = $this->createPendingOnlineOrder('src_test_123');

        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'source.chargeable',
                    'data' => [
                        'id' => 'src_test_123',
                        'type' => 'source',
                        'attributes' => [
                            'status' => 'chargeable',
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->postWebhook($payload);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.event_type', 'source.chargeable');

        $this->assertSame('pay_test_123', $order->fresh()->paymongo_payment_id);
    }

    public function test_payment_paid_marks_the_order_confirmed_and_paid(): void
    {
        [$order, $payment] = $this->createPendingOnlineOrder('src_test_paid');
        $order->update(['paymongo_payment_id' => 'pay_test_paid']);

        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'id' => 'pay_test_paid',
                        'type' => 'payment',
                        'attributes' => [
                            'paid_at' => time(),
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->postWebhook($payload);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.event_type', 'payment.paid');

        $this->assertSame('paid', $payment->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('confirmed', $order->fresh()->order_status);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'confirmed',
        ]);
    }

    public function test_payment_paid_can_resolve_a_paymaya_order_by_payment_intent_id(): void
    {
        [$order, $payment] = $this->createPendingOnlineOrder(
            null,
            'paymaya',
            'pi_test_paymaya_paid'
        );

        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'id' => 'pay_test_paymaya_paid',
                        'type' => 'payment',
                        'attributes' => [
                            'paid_at' => time(),
                            'payment_intent_id' => 'pi_test_paymaya_paid',
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->postWebhook($payload);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.event_type', 'payment.paid');

        $this->assertSame('pay_test_paymaya_paid', $order->fresh()->paymongo_payment_id);
        $this->assertSame('paid', $payment->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('confirmed', $order->fresh()->order_status);
    }

    public function test_payment_failed_cancels_the_order_and_restores_stock(): void
    {
        [$order, $payment, $product] = $this->createPendingOnlineOrder('src_test_failed');
        $order->update(['paymongo_payment_id' => 'pay_test_failed']);

        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.failed',
                    'data' => [
                        'id' => 'pay_test_failed',
                        'type' => 'payment',
                        'attributes' => [
                            'status' => 'failed',
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->postWebhook($payload);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.event_type', 'payment.failed');

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('failed', $order->fresh()->payment_status);
        $this->assertSame('cancelled', $order->fresh()->order_status);
        $this->assertSame(4, (int) $product->fresh()->stock_quantity);

        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'type' => 'return',
            'reference_id' => $order->id,
            'reference_type' => 'return',
        ]);
    }

    protected function postWebhook(array $payload)
    {
        $json = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$json, (string) config('services.paymongo.webhook_secret'));

        return $this->call('POST', '/api/v1/webhooks/paymongo', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => 't='.$timestamp.',te='.$signature,
        ], $json);
    }

    protected function createPendingOnlineOrder(
        ?string $sourceId,
        string $paymentMethod = 'gcash',
        ?string $paymentIntentId = null
    ): array
    {
        $admin = User::factory()->create([
            'email' => 'admin'.uniqid().'@example.com',
            'password' => 'password123',
        ]);
        $admin->assignRole('admin');

        $customer = User::factory()->create([
            'email' => 'webhook'.uniqid().'@example.com',
            'password' => 'password123',
        ]);
        $customer->assignRole('customer');

        $category = Category::query()->create([
            'name' => 'Whole Beans '.uniqid(),
            'slug' => 'whole-beans-'.uniqid(),
            'description' => 'Premium beans.',
            'image' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Night Shift '.uniqid(),
            'slug' => 'night-shift-'.uniqid(),
            'short_description' => 'Dark roast.',
            'description' => 'Detailed tasting notes.',
            'price' => 700.00,
            'sale_price' => null,
            'sku' => 'BH-'.strtoupper(substr(uniqid(), -6)),
            'stock_quantity' => 4,
            'low_stock_threshold' => 2,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $address = Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Home',
            'recipient_name' => $customer->name,
            'phone' => '09171234567',
            'street' => '7 Roast Street',
            'barangay' => 'Poblacion',
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
            'zip_code' => '8000',
            'is_default' => true,
        ]);

        $order = Order::query()->create([
            'order_number' => 'BH-'.now()->year.'-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'user_id' => $customer->id,
            'rider_id' => null,
            'shipping_address_id' => $address->id,
            'subtotal' => 700.00,
            'shipping_fee' => 120.00,
            'discount_amount' => 0.00,
            'total_amount' => 820.00,
            'payment_method' => $paymentMethod,
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'paymongo_payment_id' => null,
            'paymongo_checkout_url' => 'https://checkout.test/'.($sourceId ?: $paymentIntentId ?: 'pending'),
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
            'paymongo_payment_intent_id' => $paymentIntentId,
            'paymongo_source_id' => $sourceId,
            'method' => $paymentMethod,
            'amount' => 820.00,
            'currency' => 'PHP',
            'status' => 'awaiting_payment',
            'paymongo_response' => null,
            'paid_at' => null,
        ]);

        return [$order, $payment, $product, $customer, $admin];
    }
}
