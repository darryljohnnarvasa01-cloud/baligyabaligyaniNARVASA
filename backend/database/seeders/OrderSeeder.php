<?php

namespace Database\Seeders;

use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrderSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function () {
            $admin = User::query()->where('email', 'admin@brewhaus.test')->firstOrFail();

            $users = User::query()
                ->whereIn('email', [
                    'sofia.alvarez@brewhaus.test',
                    'marco.villanueva@brewhaus.test',
                    'lena.morales@brewhaus.test',
                    'josh.ramos@brewhaus.test',
                    'dan.torres@brewhaus.test',
                ])
                ->get()
                ->keyBy('email');

            $resolvePrice = function (Product $product): float {
                $basePrice = (float) $product->price;
                $salePrice = $product->sale_price !== null ? (float) $product->sale_price : null;

                if ($salePrice !== null && $salePrice < $basePrice) {
                    return $salePrice;
                }

                return $basePrice;
            };

            $payloads = [
                [
                    'order_number' => 'BH-2026-00001',
                    'customer_email' => 'sofia.alvarez@brewhaus.test',
                    'address_label' => 'Home',
                    'rider_email' => null,
                    'shipping_fee' => 120.00,
                    'discount_amount' => 0.00,
                    'payment_method' => 'gcash',
                    'payment_status' => 'pending',
                    'order_status' => 'pending',
                    'paymongo_payment_id' => 'src_bh_2026_00001',
                    'paymongo_checkout_url' => 'https://checkout.paymongo.com/test/bh-2026-00001',
                    'notes' => 'Please leave the parcel with the guard if no one answers.',
                    'shipped_at' => null,
                    'delivered_at' => null,
                    'cancelled_at' => null,
                    'items' => [
                        ['slug' => 'davao-breakfast-grind-250g', 'quantity' => 1],
                    ],
                    'logs' => [
                        ['order_status' => 'pending', 'actor' => 'customer', 'note' => 'Order placed and awaiting payment confirmation.'],
                    ],
                    'payment' => [
                        'paymongo_payment_intent_id' => 'pi_bh_2026_00001',
                        'paymongo_source_id' => 'src_bh_2026_00001',
                        'status' => 'awaiting_payment',
                        'paid_at' => null,
                        'paymongo_response' => [
                            'provider' => 'paymongo',
                            'type' => 'gcash',
                            'checkout_url' => 'https://checkout.paymongo.com/test/bh-2026-00001',
                        ],
                    ],
                ],
                [
                    'order_number' => 'BH-2026-00002',
                    'customer_email' => 'marco.villanueva@brewhaus.test',
                    'address_label' => 'Home',
                    'rider_email' => null,
                    'shipping_fee' => 0.00,
                    'discount_amount' => 0.00,
                    'payment_method' => 'paymaya',
                    'payment_status' => 'paid',
                    'order_status' => 'confirmed',
                    'paymongo_payment_id' => 'pay_bh_2026_00002',
                    'paymongo_checkout_url' => 'https://checkout.paymongo.com/test/bh-2026-00002',
                    'notes' => 'Please call on arrival.',
                    'shipped_at' => null,
                    'delivered_at' => null,
                    'cancelled_at' => null,
                    'items' => [
                        ['slug' => 'mt-apo-estate-250g', 'quantity' => 1],
                        ['slug' => 'v60-dripper-matte-black', 'quantity' => 1],
                    ],
                    'logs' => [
                        ['order_status' => 'pending', 'actor' => 'customer', 'note' => 'Order placed from the storefront.'],
                        ['order_status' => 'confirmed', 'actor' => 'admin', 'note' => 'Payment captured and order confirmed.'],
                    ],
                    'payment' => [
                        'paymongo_payment_intent_id' => 'pi_bh_2026_00002',
                        'paymongo_source_id' => 'src_bh_2026_00002',
                        'status' => 'paid',
                        'paid_at' => now()->subDays(4),
                        'paymongo_response' => [
                            'provider' => 'paymongo',
                            'type' => 'paymaya',
                            'payment_id' => 'pay_bh_2026_00002',
                        ],
                    ],
                ],
                [
                    'order_number' => 'BH-2026-00003',
                    'customer_email' => 'lena.morales@brewhaus.test',
                    'address_label' => 'Home',
                    'rider_email' => null,
                    'shipping_fee' => 0.00,
                    'discount_amount' => 0.00,
                    'payment_method' => 'cod',
                    'payment_status' => 'pending',
                    'order_status' => 'processing',
                    'paymongo_payment_id' => null,
                    'paymongo_checkout_url' => null,
                    'notes' => 'Please pack beans separately from the tote.',
                    'shipped_at' => null,
                    'delivered_at' => null,
                    'cancelled_at' => null,
                    'items' => [
                        ['slug' => 'house-espresso-grind-250g', 'quantity' => 1],
                        ['slug' => 'midnight-espresso-tote', 'quantity' => 1],
                    ],
                    'logs' => [
                        ['order_status' => 'pending', 'actor' => 'customer', 'note' => 'Cash on delivery order placed.'],
                        ['order_status' => 'confirmed', 'actor' => 'admin', 'note' => 'COD order verified for Davao delivery.'],
                        ['order_status' => 'processing', 'actor' => 'admin', 'note' => 'Items are being packed for dispatch.'],
                    ],
                    'payment' => [
                        'paymongo_payment_intent_id' => null,
                        'paymongo_source_id' => null,
                        'status' => 'pending',
                        'paid_at' => null,
                        'paymongo_response' => [
                            'provider' => 'cash_on_delivery',
                            'note' => 'Collect payment upon delivery.',
                        ],
                    ],
                ],
                [
                    'order_number' => 'BH-2026-00004',
                    'customer_email' => 'sofia.alvarez@brewhaus.test',
                    'address_label' => 'Office',
                    'rider_email' => 'josh.ramos@brewhaus.test',
                    'shipping_fee' => 0.00,
                    'discount_amount' => 0.00,
                    'payment_method' => 'gcash',
                    'payment_status' => 'paid',
                    'order_status' => 'packed',
                    'paymongo_payment_id' => 'pay_bh_2026_00004',
                    'paymongo_checkout_url' => 'https://checkout.paymongo.com/test/bh-2026-00004',
                    'notes' => 'Office reception closes at 6PM.',
                    'shipped_at' => null,
                    'delivered_at' => null,
                    'cancelled_at' => null,
                    'items' => [
                        ['slug' => 'brazilian-cerrado-500g', 'quantity' => 1],
                        ['slug' => 'roasters-box-gift-set', 'quantity' => 1],
                    ],
                    'logs' => [
                        ['order_status' => 'pending', 'actor' => 'customer', 'note' => 'Gift order placed from account checkout.'],
                        ['order_status' => 'confirmed', 'actor' => 'admin', 'note' => 'Payment verified.'],
                        ['order_status' => 'processing', 'actor' => 'admin', 'note' => 'Gift box assembled and quality checked.'],
                        ['order_status' => 'packed', 'actor' => 'admin', 'note' => 'Order packed and staged for rider assignment.'],
                    ],
                    'payment' => [
                        'paymongo_payment_intent_id' => 'pi_bh_2026_00004',
                        'paymongo_source_id' => 'src_bh_2026_00004',
                        'status' => 'paid',
                        'paid_at' => now()->subDays(2),
                        'paymongo_response' => [
                            'provider' => 'paymongo',
                            'type' => 'gcash',
                            'payment_id' => 'pay_bh_2026_00004',
                        ],
                    ],
                ],
                [
                    'order_number' => 'BH-2026-00005',
                    'customer_email' => 'marco.villanueva@brewhaus.test',
                    'address_label' => 'Office',
                    'rider_email' => 'dan.torres@brewhaus.test',
                    'shipping_fee' => 0.00,
                    'discount_amount' => 0.00,
                    'payment_method' => 'paymaya',
                    'payment_status' => 'paid',
                    'order_status' => 'out_for_delivery',
                    'paymongo_payment_id' => 'pay_bh_2026_00005',
                    'paymongo_checkout_url' => 'https://checkout.paymongo.com/test/bh-2026-00005',
                    'notes' => 'Deliver to front desk and look for Marco.',
                    'shipped_at' => now()->subHours(8),
                    'delivered_at' => null,
                    'cancelled_at' => null,
                    'items' => [
                        ['slug' => 'precision-gooseneck-kettle', 'quantity' => 1],
                        ['slug' => 'brew-scale-mini', 'quantity' => 1],
                    ],
                    'logs' => [
                        ['order_status' => 'pending', 'actor' => 'customer', 'note' => 'Equipment order placed from the shop page.'],
                        ['order_status' => 'confirmed', 'actor' => 'admin', 'note' => 'Payment captured through PayMongo.'],
                        ['order_status' => 'processing', 'actor' => 'admin', 'note' => 'Warehouse team is preparing the shipment.'],
                        ['order_status' => 'packed', 'actor' => 'admin', 'note' => 'Order boxed and labeled.'],
                        ['order_status' => 'shipped', 'actor' => 'admin', 'note' => 'Order handed to rider queue.'],
                        ['order_status' => 'out_for_delivery', 'actor' => 'dan.torres@brewhaus.test', 'note' => 'Rider picked up the parcel and is en route.'],
                    ],
                    'payment' => [
                        'paymongo_payment_intent_id' => 'pi_bh_2026_00005',
                        'paymongo_source_id' => 'src_bh_2026_00005',
                        'status' => 'paid',
                        'paid_at' => now()->subDay(),
                        'paymongo_response' => [
                            'provider' => 'paymongo',
                            'type' => 'paymaya',
                            'payment_id' => 'pay_bh_2026_00005',
                        ],
                    ],
                ],
                [
                    'order_number' => 'BH-2026-00006',
                    'customer_email' => 'lena.morales@brewhaus.test',
                    'address_label' => 'Studio',
                    'rider_email' => 'josh.ramos@brewhaus.test',
                    'shipping_fee' => 0.00,
                    'discount_amount' => 0.00,
                    'payment_method' => 'cod',
                    'payment_status' => 'paid',
                    'order_status' => 'delivered',
                    'paymongo_payment_id' => null,
                    'paymongo_checkout_url' => null,
                    'notes' => 'Customer requested delivery before lunch.',
                    'shipped_at' => now()->subHours(12),
                    'delivered_at' => now()->subHours(4),
                    'cancelled_at' => null,
                    'items' => [
                        ['slug' => 'decaf-night-shift-250g', 'quantity' => 1],
                        ['slug' => 'sunday-brew-starter-kit', 'quantity' => 1],
                        ['slug' => 'brewhaus-apron', 'quantity' => 1],
                    ],
                    'logs' => [
                        ['order_status' => 'pending', 'actor' => 'customer', 'note' => 'Starter kit order placed.'],
                        ['order_status' => 'confirmed', 'actor' => 'admin', 'note' => 'COD address confirmed.'],
                        ['order_status' => 'processing', 'actor' => 'admin', 'note' => 'Order packed with starter guide insert.'],
                        ['order_status' => 'packed', 'actor' => 'admin', 'note' => 'Parcel sealed and staged.'],
                        ['order_status' => 'shipped', 'actor' => 'admin', 'note' => 'Order released to rider dispatch.'],
                        ['order_status' => 'out_for_delivery', 'actor' => 'josh.ramos@brewhaus.test', 'note' => 'Rider departed for the delivery route.'],
                        ['order_status' => 'delivered', 'actor' => 'josh.ramos@brewhaus.test', 'note' => 'Order delivered and COD collected in full.'],
                    ],
                    'payment' => [
                        'paymongo_payment_intent_id' => null,
                        'paymongo_source_id' => null,
                        'status' => 'paid',
                        'paid_at' => now()->subHours(4),
                        'paymongo_response' => [
                            'provider' => 'cash_on_delivery',
                            'note' => 'Collected by rider upon delivery.',
                        ],
                    ],
                ],
            ];

            foreach ($payloads as $payload) {
                $customer = $users->get($payload['customer_email']);
                $rider = $payload['rider_email'] !== null ? $users->get($payload['rider_email']) : null;
                $address = $customer?->addresses()->where('label', $payload['address_label'])->first();

                if ($customer === null || $address === null) {
                    continue;
                }

                $preparedItems = [];
                $subtotal = 0.0;

                foreach ($payload['items'] as $itemPayload) {
                    $product = Product::query()->lockForUpdate()->where('slug', $itemPayload['slug'])->firstOrFail();
                    $quantity = (int) $itemPayload['quantity'];

                    if ($product->stock_quantity < $quantity) {
                        throw new \RuntimeException('Insufficient stock for '.$product->slug.' while seeding orders.');
                    }

                    $unitPrice = $resolvePrice($product);
                    $lineSubtotal = round($unitPrice * $quantity, 2);

                    $preparedItems[] = [
                        'product' => $product,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $lineSubtotal,
                    ];

                    $subtotal += $lineSubtotal;
                }

                $total = round($subtotal + (float) $payload['shipping_fee'] - (float) $payload['discount_amount'], 2);

                $order = Order::query()->create([
                    'order_number' => $payload['order_number'],
                    'user_id' => $customer->id,
                    'rider_id' => $rider?->id,
                    'shipping_address_id' => $address->id,
                    'subtotal' => round($subtotal, 2),
                    'shipping_fee' => $payload['shipping_fee'],
                    'discount_amount' => $payload['discount_amount'],
                    'total_amount' => $total,
                    'payment_method' => $payload['payment_method'],
                    'payment_status' => $payload['payment_status'],
                    'order_status' => $payload['order_status'],
                    'paymongo_payment_id' => $payload['paymongo_payment_id'],
                    'paymongo_checkout_url' => $payload['paymongo_checkout_url'],
                    'notes' => $payload['notes'],
                    'shipped_at' => $payload['shipped_at'],
                    'delivered_at' => $payload['delivered_at'],
                    'cancelled_at' => $payload['cancelled_at'],
                ]);

                foreach ($preparedItems as $item) {
                    /** @var Product $product */
                    $product = $item['product'];
                    $quantityAfter = $product->stock_quantity - $item['quantity'];

                    $order->items()->create([
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'product_sku' => $product->sku,
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    $product->update(['stock_quantity' => $quantityAfter]);

                    InventoryLog::query()->create([
                        'product_id' => $product->id,
                        'type' => 'deduction',
                        'quantity_change' => -$item['quantity'],
                        'quantity_after' => $quantityAfter,
                        'reference_id' => $order->id,
                        'note' => 'Seeded deduction for order '.$order->order_number,
                        'created_by' => $customer->id,
                    ]);
                }

                foreach ($payload['logs'] as $logPayload) {
                    $changedBy = match ($logPayload['actor']) {
                        'customer' => $customer,
                        'admin' => $admin,
                        default => $users->get($logPayload['actor']),
                    };

                    if ($changedBy === null) {
                        continue;
                    }

                    $order->statusLogs()->create([
                        'order_status' => $logPayload['order_status'],
                        'changed_by' => $changedBy->id,
                        'note' => $logPayload['note'],
                    ]);
                }

                Payment::query()->create([
                    'order_id' => $order->id,
                    'user_id' => $customer->id,
                    'paymongo_payment_intent_id' => $payload['payment']['paymongo_payment_intent_id'],
                    'paymongo_source_id' => $payload['payment']['paymongo_source_id'],
                    'method' => $payload['payment_method'],
                    'amount' => $total,
                    'currency' => 'PHP',
                    'status' => $payload['payment']['status'],
                    'paymongo_response' => $payload['payment']['paymongo_response'],
                    'paid_at' => $payload['payment']['paid_at'],
                ]);
            }
        });
    }
}