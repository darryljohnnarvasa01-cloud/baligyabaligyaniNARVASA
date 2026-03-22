<?php

namespace Tests\Feature\Checkout;

use App\Models\Address;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CouponCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');

        config([
            'services.paymongo.public_key' => 'pk_test_coupon',
            'services.paymongo.secret_key' => 'sk_test_coupon',
            'services.paymongo.frontend_url' => 'http://localhost:5173',
        ]);
    }

    public function test_customer_can_preview_coupon_against_the_live_cart(): void
    {
        [$customer, $address, $coupon] = $this->createCheckoutFixture();

        $response = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/checkout/coupon', [
                'coupon_code' => $coupon->code,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.coupon.code', 'MIDNIGHT10')
            ->assertJsonPath('data.discount_amount', 140)
            ->assertJsonPath('data.total_amount', 1260);

        $this->assertSame('Home', $address->label);
    }

    public function test_checkout_applies_coupon_and_customer_cancel_releases_usage(): void
    {
        Http::fake([
            'https://api.paymongo.com/v1/sources' => Http::response([
                'data' => [
                    'id' => 'src_coupon_123',
                    'attributes' => [
                        'redirect' => [
                            'checkout_url' => 'https://checkout.test/src_coupon_123',
                        ],
                    ],
                ],
            ], 200),
        ]);

        [$customer, $address, $coupon] = $this->createCheckoutFixture();

        $checkoutResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/checkout', [
                'shipping_address_id' => $address->id,
                'payment_method' => 'gcash',
                'coupon_code' => $coupon->code,
            ]);

        $checkoutResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.coupon_code', 'MIDNIGHT10')
            ->assertJsonPath('data.discount_amount', 140);

        /** @var Order $order */
        $order = Order::query()->where('order_number', $checkoutResponse->json('data.order_number'))->firstOrFail();

        $this->assertSame('MIDNIGHT10', $order->coupon_code);
        $this->assertSame('140.00', $order->discount_amount);
        $this->assertSame(1, (int) $coupon->fresh()->used_count);

        $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/customer/orders/'.$order->order_number.'/cancel')
            ->assertOk()
            ->assertJsonPath('data.order_status', 'cancelled');

        $this->assertSame(0, (int) $coupon->fresh()->used_count);
        $this->assertSame(12, (int) Product::query()->firstOrFail()->stock_quantity);
    }

    protected function createCheckoutFixture(): array
    {
        $customer = User::factory()->create([
            'email' => 'coupon'.uniqid().'@example.com',
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
            'name' => 'Midnight Reserve '.uniqid(),
            'slug' => 'midnight-reserve-'.uniqid(),
            'short_description' => 'Dark and bold.',
            'description' => 'Detailed tasting notes.',
            'price' => 700.00,
            'sale_price' => null,
            'sku' => 'BH-'.strtoupper(substr(uniqid(), -6)),
            'stock_quantity' => 12,
            'low_stock_threshold' => 3,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $cart = Cart::query()->create([
            'user_id' => $customer->id,
            'session_id' => null,
        ]);

        $cart->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 700.00,
        ]);

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

        $coupon = Coupon::query()->create([
            'code' => 'MIDNIGHT10',
            'type' => 'percent',
            'value' => 10.00,
            'min_order_amount' => 999.00,
            'usage_limit' => 50,
            'used_count' => 0,
            'expires_at' => now()->addWeek(),
            'is_active' => true,
        ]);

        return [$customer, $address, $coupon];
    }

    protected function authHeaderFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->createToken('coupon-checkout-token')->plainTextToken,
        ];
    }
}
