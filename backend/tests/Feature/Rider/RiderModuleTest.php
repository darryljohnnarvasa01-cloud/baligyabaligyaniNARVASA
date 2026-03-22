<?php

namespace Tests\Feature\Rider;

use App\Models\Address;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RiderModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    /**
     * @return array<string, string>
     */
    private function authHeaderFor(User $user): array
    {
        $token = $user->createToken('test-token')->plainTextToken;

        return [
            'Authorization' => 'Bearer '.$token,
        ];
    }

    /**
     * @return array{customer: User, rider: User, order: Order}
     */
    private function createAssignedOrder(string $orderStatus = 'packed', ?User $rider = null): array
    {
        $assignedRider = $rider ?? User::factory()->create();
        $assignedRider->assignRole('rider');

        $customer = User::factory()->create();
        $customer->assignRole('customer');

        $address = Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Home',
            'recipient_name' => $customer->name,
            'phone' => '09123456789',
            'street' => '12 Roast Street',
            'barangay' => 'Poblacion',
            'city' => 'Davao City',
            'province' => 'Davao del Sur',
            'zip_code' => '8000',
            'is_default' => true,
        ]);

        $category = Category::query()->firstOrCreate(
            ['slug' => 'whole-beans'],
            [
                'name' => 'Whole Beans',
                'description' => 'Whole bean coffees',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Night Bloom',
            'slug' => 'night-bloom-'.$orderStatus.'-'.fake()->unique()->numerify('###'),
            'short_description' => 'Dark roast',
            'description' => 'Single-origin coffee beans.',
            'price' => 550.00,
            'sale_price' => 499.00,
            'sku' => 'NB-'.$orderStatus.'-'.fake()->unique()->numerify('###'),
            'stock_quantity' => 25,
            'low_stock_threshold' => 5,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $order = Order::query()->create([
            'order_number' => 'BH-2026-'.fake()->unique()->numerify('#####'),
            'user_id' => $customer->id,
            'rider_id' => $assignedRider->id,
            'shipping_address_id' => $address->id,
            'subtotal' => 499.00,
            'shipping_fee' => 60.00,
            'discount_amount' => 0.00,
            'total_amount' => 559.00,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => $orderStatus,
            'notes' => 'Leave at the gate.',
            'shipped_at' => $orderStatus === 'out_for_delivery' ? now()->subHour() : null,
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku,
            'quantity' => 1,
            'unit_price' => 499.00,
            'subtotal' => 499.00,
        ]);

        Payment::query()->create([
            'order_id' => $order->id,
            'user_id' => $customer->id,
            'paymongo_payment_intent_id' => null,
            'paymongo_source_id' => null,
            'method' => 'cod',
            'amount' => 559.00,
            'currency' => 'PHP',
            'status' => 'pending',
            'paymongo_response' => ['channel' => 'cod'],
            'paid_at' => null,
        ]);

        $order->statusLogs()->create([
            'order_status' => $orderStatus,
            'changed_by' => $assignedRider->id,
            'note' => 'Assigned to rider.',
        ]);

        return [
            'customer' => $customer,
            'rider' => $assignedRider,
            'order' => $order,
        ];
    }

    /**
     * @return array{customer: User, order: Order}
     */
    private function createQueueOrder(string $orderStatus = 'packed'): array
    {
        $payload = $this->createAssignedOrder($orderStatus);
        $order = $payload['order'];

        $order->forceFill(['rider_id' => null])->save();

        return [
            'customer' => $payload['customer'],
            'order' => $order->fresh(),
        ];
    }

    public function test_rider_lists_only_packed_shipped_and_out_for_delivery_orders(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $packed = $this->createAssignedOrder('packed', $rider);
        $shipped = $this->createAssignedOrder('shipped', $rider);
        $outForDelivery = $this->createAssignedOrder('out_for_delivery', $rider);
        $this->createAssignedOrder('delivered', $rider);

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->getJson('/api/v1/rider/orders');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Orders retrieved.');

        $data = $response->json('data');

        $this->assertCount(3, $data);
        $this->assertEqualsCanonicalizing(
            [$packed['order']->order_number, $shipped['order']->order_number, $outForDelivery['order']->order_number],
            array_column($data, 'order_number')
        );
    }

    public function test_rider_can_view_delivery_queue_and_accept_order(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $queueOrder = $this->createQueueOrder('packed');

        $queueResponse = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->getJson('/api/v1/rider/orders/queue');

        $queueResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Available deliveries retrieved.')
            ->assertJsonPath('data.0.id', $queueOrder['order']->id);

        $acceptResponse = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->patchJson('/api/v1/rider/orders/'.$queueOrder['order']->id.'/accept');

        $acceptResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Delivery accepted.')
            ->assertJsonPath('data.rider_id', $rider->id);

        $this->assertDatabaseHas('orders', [
            'id' => $queueOrder['order']->id,
            'rider_id' => $rider->id,
        ]);
    }

    public function test_rider_summary_returns_active_runs_queue_and_earnings(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $this->createAssignedOrder('packed', $rider);
        $this->createAssignedOrder('delivered', $rider);
        $this->createQueueOrder('packed');

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->getJson('/api/v1/rider/summary');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Rider summary retrieved.')
            ->assertJsonPath('data.active_runs', 1)
            ->assertJsonPath('data.queue_open', 1)
            ->assertJsonPath('data.delivered_total', 1);
    }

    public function test_rider_can_view_assigned_order_detail(): void
    {
        $payload = $this->createAssignedOrder('packed');
        $rider = $payload['rider'];
        $order = $payload['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->getJson('/api/v1/rider/orders/'.$order->id);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Order retrieved.')
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.order_status', 'packed')
            ->assertJsonPath('data.shipping_address.city', 'Davao City')
            ->assertJsonPath('data.items.0.product_name', 'Night Bloom');
    }

    public function test_rider_cannot_view_other_rider_order(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $other = $this->createAssignedOrder('packed');
        $order = $other['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->getJson('/api/v1/rider/orders/'.$order->id);

        $response
            ->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    public function test_rider_can_pickup_packed_order(): void
    {
        $payload = $this->createAssignedOrder('packed');
        $rider = $payload['rider'];
        $order = $payload['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->patchJson('/api/v1/rider/orders/'.$order->id.'/pickup');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Order picked up.')
            ->assertJsonPath('data.order_status', 'out_for_delivery');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'out_for_delivery',
        ]);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'out_for_delivery',
            'changed_by' => $rider->id,
        ]);
    }

    public function test_rider_can_deliver_out_for_delivery_order(): void
    {
        Storage::fake('public');

        $payload = $this->createAssignedOrder('out_for_delivery');
        $rider = $payload['rider'];
        $order = $payload['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->post('/api/v1/rider/orders/'.$order->id.'/deliver', [
                '_method' => 'PATCH',
                'delivery_note' => 'Recipient received the parcel and COD was collected.',
                'proof_image' => UploadedFile::fake()->image('proof.jpg'),
            ], $this->authHeaderFor($rider));

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Order delivered.')
            ->assertJsonPath('data.order_status', 'delivered')
            ->assertJsonPath('data.delivery_proof_notes', 'Recipient received the parcel and COD was collected.');

        $this->assertNotNull($response->json('data.delivered_at'));
        $this->assertNotNull($response->json('data.delivery_proof_url'));

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'delivered',
            'delivery_proof_notes' => 'Recipient received the parcel and COD was collected.',
        ]);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'delivered',
            'changed_by' => $rider->id,
        ]);
    }

    public function test_rider_cannot_deliver_without_proof_image(): void
    {
        $payload = $this->createAssignedOrder('out_for_delivery');
        $rider = $payload['rider'];
        $order = $payload['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->patchJson('/api/v1/rider/orders/'.$order->id.'/deliver', [
                'delivery_note' => 'Recipient confirmed the drop-off.',
            ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Unable to deliver order.')
            ->assertJsonPath('errors.proof_image.0', 'A proof-of-delivery photo is required before completing this order.');
    }

    public function test_rider_cannot_deliver_packed_order(): void
    {
        Storage::fake('public');

        $payload = $this->createAssignedOrder('packed');
        $rider = $payload['rider'];
        $order = $payload['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->post('/api/v1/rider/orders/'.$order->id.'/deliver', [
                '_method' => 'PATCH',
                'proof_image' => UploadedFile::fake()->image('proof.jpg'),
            ], $this->authHeaderFor($rider));

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Unable to deliver order.')
            ->assertJsonPath('errors.order_status.0', 'Only orders out for delivery can be delivered.');
    }

    public function test_rider_can_update_live_location(): void
    {
        $rider = User::factory()->create();
        $rider->assignRole('rider');

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->putJson('/api/v1/rider/location', [
                'lat' => 7.85230001,
                'lng' => 125.09240001,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Location updated.')
            ->assertJsonPath('data.current_lat', 7.85230001)
            ->assertJsonPath('data.current_lng', 125.09240001);

        $rider->refresh();

        $this->assertSame(7.85230001, (float) $rider->current_lat);
        $this->assertSame(125.09240001, (float) $rider->current_lng);
        $this->assertNotNull($rider->location_updated_at);
    }

    public function test_rider_can_upload_delivery_proof_before_completion(): void
    {
        Storage::fake('public');

        $payload = $this->createAssignedOrder('out_for_delivery');
        $rider = $payload['rider'];
        $order = $payload['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->post('/api/v1/rider/orders/'.$order->id.'/proof', [
                'proof_image' => UploadedFile::fake()->image('proof.jpg'),
            ], $this->authHeaderFor($rider));

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Delivery proof uploaded.')
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.order_status', 'out_for_delivery');

        $this->assertNotNull($response->json('data.delivery_proof_url'));

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'out_for_delivery',
            'changed_by' => $rider->id,
            'note' => 'Rider uploaded a delivery proof photo.',
        ]);
    }

    public function test_rider_can_report_delivery_issue(): void
    {
        $payload = $this->createAssignedOrder('out_for_delivery');
        $rider = $payload['rider'];
        $order = $payload['order'];

        $response = $this
            ->withHeaders($this->authHeaderFor($rider))
            ->postJson('/api/v1/rider/orders/'.$order->id.'/issue', [
                'issue_type' => 'customer_unreachable',
                'details' => 'Customer is not answering the phone near the drop-off point.',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Issue reported.')
            ->assertJsonPath('data.id', $order->id);

        $this->assertDatabaseHas('order_status_logs', [
            'order_id' => $order->id,
            'order_status' => 'out_for_delivery',
            'changed_by' => $rider->id,
            'note' => 'Rider issue reported: Customer Unreachable. Customer is not answering the phone near the drop-off point.',
        ]);
    }
}
