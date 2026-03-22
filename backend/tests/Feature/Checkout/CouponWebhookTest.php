<?php

namespace Tests\Feature\Checkout;

use App\Models\Address;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CouponWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');

        config([
            'services.paymongo.public_key' => 'pk_test_coupon_webhook',
            'services.paymongo.secret_key' => 'sk_test_coupon_webhook',
            'services.paymongo.webhook_secret' => 'whsec_test_coupon_webhook',
            'services.paymongo.frontend_url' => 'http://localhost:5173',
        ]);
    }

    public function test_payment_failed_releases_coupon_usage(): void
    {
        [$order, $coupon] = $this->createPendingCouponOrder();

        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.failed',
                    'data' => [
                        'id' => 'pay_coupon_failed',
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

        $this->assertSame(0, (int) $coupon->fresh()->used_count);
        $this->assertSame('cancelled', $order->fresh()->order_status);
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

    protected function createPendingCouponOrder(): array
    {
        $admin = User::factory()->create([
            'email' => 'admin'.uniqid().'@example.com',
            'password' => 'password123',
        ]);
        $admin->assignRole('admin');

        $customer = User::factory()->create([
            'email' => 'coupon-webhook'.uniqid().'@example.com',
            'password' => 'password123',
        ]);
        $customer->assignRole('customer');

        $coupon = Coupon::query()->create([
            'code' => 'MIDNIGHT10',
            'type' => 'percent',
            'value' => 10.00,
            'min_order_amount' => 999.00,
            'usage_limit' => 50,
            'used_count' => 1,
            'expires_at' => now()->addWeek(),
            'is_active' => true,
        ]);

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
            'stock_quantity' => 2,
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
            'coupon_id' => $coupon->id,
            'coupon_code' => $coupon->code,
            'subtotal' => 1400.00,
            'shipping_fee' => 0.00,
            'discount_amount' => 140.00,
            'total_amount' => 1260.00,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'paymongo_payment_id' => 'pay_coupon_failed',
            'paymongo_checkout_url' => 'https://checkout.test/src_coupon_failed',
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
            'unit_price' => 700.00,
            'subtotal' => 1400.00,
        ]);

        $order->statusLogs()->create([
            'order_status' => 'pending',
            'changed_by' => $customer->id,
            'note' => 'Awaiting payment.',
        ]);

        $product->decrement('stock_quantity', 2);

        Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'paymongo_payment_intent_id' => null,
            'paymongo_source_id' => 'src_coupon_failed',
            'method' => 'gcash',
            'amount' => 1260.00,
            'currency' => 'PHP',
            'status' => 'awaiting_payment',
            'paymongo_response' => null,
            'paid_at' => null,
        ]);

        return [$order, $coupon];
    }
}
