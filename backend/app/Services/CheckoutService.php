<?php

namespace App\Services;

use App\Jobs\SendOrderConfirmationJob;
use App\Services\Admin\AdminInventoryService;
use App\Models\Address;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public const FREE_SHIPPING_THRESHOLD = 999.00;

    public const STANDARD_SHIPPING_FEE = 120.00;

    public function __construct(
        protected PayMongoService $payMongoService,
        protected CouponService $couponService,
        protected AdminInventoryService $inventoryService,
    ) {}

    /**
     * @return array{coupon: Coupon, discount_amount: float, subtotal: float, shipping_fee: float, total_amount: float}
     */
    public function previewCoupon(User $user, string $couponCode): array
    {
        return DB::transaction(function () use ($user, $couponCode): array {
            $snapshot = $this->resolveCartSnapshot($user, true);
            $shippingFee = (float) $this->resolveShippingFee($snapshot['subtotal']);
            $couponData = $this->couponService->resolveDiscount($couponCode, $snapshot['subtotal'], true);
            $discountAmount = (float) $couponData['discount_amount'];

            return [
                'coupon' => $couponData['coupon'],
                'discount_amount' => $discountAmount,
                'subtotal' => (float) $this->formatAmount($snapshot['subtotal']),
                'shipping_fee' => $shippingFee,
                'total_amount' => (float) $this->formatAmount(max(0, $snapshot['subtotal'] + $shippingFee - $discountAmount)),
            ];
        });
    }

    public function initiate(User $user, array $payload): Order
    {
        return DB::transaction(function () use ($user, $payload): Order {
            $snapshot = $this->resolveCartSnapshot($user, true);
            /** @var Cart $cart */
            $cart = $snapshot['cart'];
            $lineItems = $snapshot['line_items'];
            $subtotal = $snapshot['subtotal'];

            $address = Address::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->find($payload['shipping_address_id']);

            if (! $address) {
                throw (new ModelNotFoundException())->setModel(Address::class, [(int) $payload['shipping_address_id']]);
            }

            $paymentMethod = (string) $payload['payment_method'];

            if ($paymentMethod === 'cod') {
                $this->ensureCodAddressEligible($address);
            }

            $coupon = null;
            $couponCode = null;
            $discountAmount = '0.00';

            if (! empty($payload['coupon_code'])) {
                $couponData = $this->couponService->resolveDiscount((string) $payload['coupon_code'], $subtotal, true);
                $coupon = $couponData['coupon'];
                $couponCode = $coupon->code;
                $discountAmount = $couponData['discount_amount'];
            }

            $shippingFee = $this->resolveShippingFee($subtotal);
            $totalAmount = $this->formatAmount(max(0, ((float) $shippingFee) + $subtotal - (float) $discountAmount));

            $order = Order::query()->create([
                'order_number' => $this->generateOrderNumber(),
                'user_id' => $user->id,
                'rider_id' => null,
                'shipping_address_id' => $address->id,
                'coupon_id' => $coupon?->id,
                'coupon_code' => $couponCode,
                'subtotal' => $this->formatAmount($subtotal),
                'shipping_fee' => $shippingFee,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'payment_method' => $paymentMethod,
                'payment_status' => 'pending',
                'order_status' => 'pending',
                'paymongo_payment_id' => null,
                'paymongo_checkout_url' => null,
                'notes' => $payload['notes'] ?? null,
                'shipped_at' => null,
                'delivered_at' => null,
                'cancelled_at' => null,
            ]);

            if ($coupon) {
                $coupon->increment('used_count');
            }

            foreach ($lineItems as $lineItem) {
                /** @var Product $product */
                $product = $lineItem['product'];
                $quantity = (int) $lineItem['quantity'];

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'selected_size' => $lineItem['selected_size'] !== '' ? $lineItem['selected_size'] : null,
                    'quantity' => $quantity,
                    'unit_price' => $lineItem['unit_price'],
                    'subtotal' => $lineItem['subtotal'],
                ]);

                $this->inventoryService->deductStock(
                    $product,
                    $quantity,
                    'Stock deducted for checkout order '.$order->order_number.'.',
                    (int) $user->id,
                    (int) $order->id,
                    'checkout'
                );
            }

            $payment = Payment::query()->create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'paymongo_payment_intent_id' => null,
                'paymongo_source_id' => null,
                'method' => $paymentMethod,
                'amount' => $totalAmount,
                'currency' => 'PHP',
                'status' => $paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
                'paymongo_response' => null,
                'paid_at' => null,
            ]);

            $this->appendStatusLog($order, 'pending', $user->id, 'Checkout initiated.');

            if ($paymentMethod === 'cod') {
                $order->forceFill([
                    'order_status' => 'confirmed',
                ])->save();

                $this->appendStatusLog($order, 'confirmed', $user->id, 'Cash on delivery order confirmed.');
                DB::afterCommit(fn () => SendOrderConfirmationJob::dispatchSync($order->id));
            } else {
                $redirectUrls = $this->payMongoService->redirectUrls($order->order_number);
                $gateway = $paymentMethod === 'gcash'
                    ? $this->payMongoService->createGCashSource((float) $totalAmount, $order->order_number, $redirectUrls)
                    : $this->payMongoService->createPayMayaCheckoutSession((float) $totalAmount, $order->order_number, $redirectUrls);

                $order->forceFill([
                    'paymongo_checkout_url' => $gateway['checkout_url'] ?? null,
                ])->save();

                $payment->forceFill([
                    'paymongo_payment_intent_id' => $gateway['payment_intent_id'] ?? null,
                    'paymongo_source_id' => $gateway['source_id'] ?? null,
                    'status' => 'awaiting_payment',
                    'paymongo_response' => [
                        $paymentMethod === 'gcash' ? 'source' : 'checkout_session' => $gateway['response'] ?? $gateway,
                    ],
                ])->save();
            }

            $cart->items()->delete();

            return $this->loadOrder((int) $order->id);
        });
    }

    public function findOrderForCustomer(User $user, string $orderNumber): Order
    {
        $order = Order::query()
            ->where('user_id', $user->id)
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        return $this->refreshOrderPaymentStatus($order);
    }

    public function refreshOrderPaymentStatus(Order $order): Order
    {
        return $this->loadOrder((int) $this->attemptPaymentReconciliation($order)->id);
    }

    public function cancelPendingOrderForCustomer(Order $order, User $user): Order
    {
        if ($order->user_id !== $user->id) {
            throw (new ModelNotFoundException())->setModel(Order::class, [$order->id]);
        }

        if ($order->order_status !== 'pending' || $order->payment_status !== 'pending') {
            throw ValidationException::withMessages([
                'order' => ['Only pending unpaid orders can be cancelled.'],
            ]);
        }

        return DB::transaction(function () use ($order, $user): Order {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedOrder->order_status !== 'pending' || $lockedOrder->payment_status !== 'pending') {
                throw ValidationException::withMessages([
                    'order' => ['Only pending unpaid orders can be cancelled.'],
                ]);
            }

            $payment = Payment::query()
                ->where('order_id', $lockedOrder->id)
                ->lockForUpdate()
                ->first();

            $this->restoreOrderStock($lockedOrder, $user->id, 'Stock restored after customer cancellation.');
            $this->couponService->releaseUsage($lockedOrder);

            $lockedOrder->forceFill([
                'order_status' => 'cancelled',
                'cancelled_at' => now(),
            ])->save();

            if ($payment && $payment->status === 'awaiting_payment') {
                $payment->forceFill([
                    'status' => 'failed',
                    'paymongo_response' => $this->mergeGatewayPayload($payment->paymongo_response, [
                        'customer_cancelled' => [
                            'cancelled_at' => now()->toIso8601String(),
                            'order_number' => $lockedOrder->order_number,
                        ],
                    ]),
                ])->save();
            }

            $this->appendStatusLog($lockedOrder, 'cancelled', $user->id, 'Order cancelled by customer.');

            return $this->loadOrder((int) $lockedOrder->id);
        });
    }

    public function markPaymentPaid(
        array $resource,
        string $payloadKey = 'payment_paid_webhook',
        ?string $confirmationNote = null
    ): ?Order
    {
        return DB::transaction(function () use ($confirmationNote, $payloadKey, $resource): ?Order {
            $paymentContext = $this->resolvePaymentContext($resource);

            if (! $paymentContext) {
                return null;
            }

            /** @var Order $order */
            $order = $paymentContext['order'];
            /** @var Payment|null $payment */
            $payment = $paymentContext['payment'];

            if (! $payment) {
                return $this->loadOrder((int) $order->id);
            }

            $this->applyPaidPaymentState(
                $order,
                $payment,
                $resource,
                [$payloadKey => $resource],
                $confirmationNote ?? 'Payment confirmed by PayMongo webhook.'
            );

            return $this->loadOrder((int) $order->id);
        });
    }

    public function markPaymentFailed(
        array $resource,
        string $payloadKey = 'payment_failed_webhook',
        ?string $failureNote = null
    ): ?Order
    {
        return DB::transaction(function () use ($failureNote, $payloadKey, $resource): ?Order {
            $paymentContext = $this->resolvePaymentContext($resource);

            if (! $paymentContext) {
                return null;
            }

            /** @var Order $order */
            $order = $paymentContext['order'];
            /** @var Payment|null $payment */
            $payment = $paymentContext['payment'];

            $this->applyFailedPaymentState(
                $order,
                $payment,
                $resource,
                [$payloadKey => $resource],
                $failureNote ?? 'Payment failed via PayMongo webhook.'
            );

            return $this->loadOrder((int) $order->id);
        });
    }

    public function handleChargeableSource(array $resource, string $payloadKey = 'source_chargeable_webhook'): ?Order
    {
        $sourceId = (string) data_get($resource, 'id', '');

        if ($sourceId === '') {
            return null;
        }

        return DB::transaction(function () use ($payloadKey, $resource, $sourceId): ?Order {
            $payment = Payment::query()
                ->where('paymongo_source_id', $sourceId)
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                return null;
            }

            $order = Order::query()
                ->where('id', $payment->order_id)
                ->lockForUpdate()
                ->first();

            if (! $order) {
                return null;
            }

            if ($order->paymongo_payment_id) {
                return $this->loadOrder((int) $order->id);
            }

            $gateway = $this->payMongoService->createPaymentFromSource(
                $sourceId,
                (float) $payment->amount,
                'BrewHaus payment for order '.$order->order_number
            );

            $paymentResource = data_get($gateway, 'response.data');
            $paymongoPaymentId = (string) ($gateway['payment_id'] ?? data_get($paymentResource, 'id', ''));
            $paymentStatus = strtolower((string) data_get($paymentResource, 'attributes.status', ''));
            $mergedPayload = [
                $payloadKey => $resource,
                'payment_create' => $gateway['response'] ?? $gateway,
            ];

            if ($paymongoPaymentId !== '') {
                $order->forceFill([
                    'paymongo_payment_id' => $paymongoPaymentId,
                ])->save();
            }

            if ($paymentStatus === 'paid' && is_array($paymentResource)) {
                $this->applyPaidPaymentState(
                    $order,
                    $payment,
                    $paymentResource,
                    $mergedPayload,
                    'Payment confirmed after PayMongo source reconciliation.'
                );

                return $this->loadOrder((int) $order->id);
            }

            if (in_array($paymentStatus, ['failed', 'cancelled'], true) && is_array($paymentResource)) {
                $this->applyFailedPaymentState(
                    $order,
                    $payment,
                    $paymentResource,
                    $mergedPayload,
                    'Payment failed after PayMongo source reconciliation.'
                );

                return $this->loadOrder((int) $order->id);
            }

            $payment->forceFill([
                'status' => 'awaiting_payment',
                'paymongo_response' => $this->mergeGatewayPayload($payment->paymongo_response, $mergedPayload),
            ])->save();

            return $this->loadOrder((int) $order->id);
        });
    }

    public function markSourceFailed(array $resource): ?Order
    {
        $sourceId = (string) data_get($resource, 'id', '');

        if ($sourceId === '') {
            return null;
        }

        return DB::transaction(function () use ($resource, $sourceId): ?Order {
            $payment = Payment::query()
                ->where('paymongo_source_id', $sourceId)
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                return null;
            }

            $order = Order::query()
                ->where('id', $payment->order_id)
                ->lockForUpdate()
                ->first();

            if (! $order) {
                return null;
            }

            $this->applyFailedPaymentState(
                $order,
                $payment,
                $resource,
                ['source_retrieved' => $resource],
                'Payment failed after PayMongo source reconciliation.'
            );

            return $this->loadOrder((int) $order->id);
        });
    }

    public function markCheckoutSessionPaid(array $resource): ?Order
    {
        $paymentResource = $this->extractCheckoutSessionPayment($resource);

        if (! $paymentResource) {
            return null;
        }

        return $this->markPaymentPaid(
            $paymentResource,
            'checkout_session_paid_webhook',
            'Payment confirmed by PayMongo checkout session webhook.'
        );
    }

    protected function restoreOrderStock(Order $order, int $actorId, string $note): void
    {
        $orderItems = $order->items()->get();
        $products = Product::query()
            ->whereIn('id', $orderItems->pluck('product_id')->all())
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        foreach ($orderItems as $orderItem) {
            /** @var Product|null $product */
            $product = $products->get((int) $orderItem->product_id);

            if (! $product) {
                continue;
            }

            $this->inventoryService->restoreStock(
                $product,
                (int) $orderItem->quantity,
                $note,
                $actorId,
                (int) $order->id,
                'return'
            );
        }
    }

    protected function appendStatusLog(Order $order, string $status, int $changedBy, ?string $note = null): void
    {
        $order->statusLogs()->create([
            'order_status' => $status,
            'changed_by' => $changedBy,
            'note' => $note,
        ]);
    }

    /**
     * @return array{order: Order, payment: Payment|null}|null
     */
    protected function resolvePaymentContext(array $resource): ?array
    {
        $paymentId = trim((string) data_get($resource, 'id', ''));
        $paymentIntentId = trim((string) (
            data_get($resource, 'attributes.payment_intent_id')
            ?? data_get($resource, 'attributes.payment_intent.id')
            ?? ''
        ));

        if ($paymentId !== '') {
            $order = Order::query()
                ->where('paymongo_payment_id', $paymentId)
                ->lockForUpdate()
                ->first();

            if ($order) {
                return [
                    'order' => $order,
                    'payment' => Payment::query()
                        ->where('order_id', $order->id)
                        ->lockForUpdate()
                        ->first(),
                ];
            }
        }

        if ($paymentIntentId === '') {
            return null;
        }

        $payment = Payment::query()
            ->where('paymongo_payment_intent_id', $paymentIntentId)
            ->lockForUpdate()
            ->first();

        if (! $payment) {
            return null;
        }

        $order = Order::query()
            ->whereKey($payment->order_id)
            ->lockForUpdate()
            ->first();

        if (! $order) {
            return null;
        }

        if ($paymentId !== '' && $order->paymongo_payment_id !== $paymentId) {
            $order->forceFill([
                'paymongo_payment_id' => $paymentId,
            ])->save();
        }

        return [
            'order' => $order,
            'payment' => $payment,
        ];
    }

    protected function applyPaidPaymentState(
        Order $order,
        Payment $payment,
        array $resource,
        array $payload,
        string $confirmationNote
    ): void {
        $payment->forceFill([
            'status' => 'paid',
            'paymongo_response' => $this->mergeGatewayPayload($payment->paymongo_response, $payload),
            'paid_at' => $this->resolvePaidAt($resource),
        ])->save();

        $shouldLogConfirmation = $order->order_status === 'pending';

        $order->forceFill([
            'payment_status' => 'paid',
            'order_status' => $shouldLogConfirmation ? 'confirmed' : $order->order_status,
        ])->save();

        if ($shouldLogConfirmation) {
            $this->appendStatusLog($order, 'confirmed', $this->resolveSystemActorId($order), $confirmationNote);
            DB::afterCommit(fn () => SendOrderConfirmationJob::dispatchSync($order->id));
        }
    }

    protected function applyFailedPaymentState(
        Order $order,
        ?Payment $payment,
        array $resource,
        array $payload,
        string $failureNote
    ): void {
        if ($payment) {
            $payment->forceFill([
                'status' => 'failed',
                'paymongo_response' => $this->mergeGatewayPayload($payment->paymongo_response, $payload),
            ])->save();
        }

        if ($this->shouldAutoCancelForFailedPayment($order)) {
            $actorId = $this->resolveSystemActorId($order);
            $this->restoreOrderStock($order, $actorId, 'Stock restored after failed PayMongo payment.');
            $this->couponService->releaseUsage($order);

            $order->forceFill([
                'payment_status' => 'failed',
                'order_status' => 'cancelled',
                'cancelled_at' => now(),
            ])->save();

            $this->appendStatusLog($order, 'cancelled', $actorId, $failureNote);

            return;
        }

        $order->forceFill([
            'payment_status' => 'failed',
        ])->save();

        if (! in_array($order->order_status, ['cancelled', 'refunded'], true)) {
            $this->appendStatusLog(
                $order,
                $order->order_status,
                $this->resolveSystemActorId($order),
                'Payment failed after fulfillment had already started. Manual review required.'
            );
        }
    }

    protected function resolveShippingFee(float $subtotal): string
    {
        if ($subtotal >= self::FREE_SHIPPING_THRESHOLD) {
            return '0.00';
        }

        return $this->formatAmount(self::STANDARD_SHIPPING_FEE);
    }

    protected function generateOrderNumber(): string
    {
        $year = now()->year;
        $prefix = 'BH-'.$year.'-';
        $latestNumber = Order::withTrashed()
            ->where('order_number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->latest('id')
            ->value('order_number');

        $sequence = 1;

        if (is_string($latestNumber) && str_starts_with($latestNumber, $prefix)) {
            $sequence = ((int) substr($latestNumber, strlen($prefix))) + 1;
        }

        return $prefix.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
    }

    protected function ensureCodAddressEligible(Address $address): void
    {
        $city = strtolower(trim((string) $address->city));

        if (! str_contains($city, 'valencia')) {
            throw ValidationException::withMessages([
                'payment_method' => ['Cash on Delivery is currently limited to Valencia addresses only.'],
            ]);
        }
    }

    protected function resolvePaidAt(array $resource): Carbon
    {
        $timestamp = (int) data_get($resource, 'attributes.paid_at', 0);

        if ($timestamp <= 0) {
            return now();
        }

        return Carbon::createFromTimestamp($timestamp);
    }

    protected function attemptPaymentReconciliation(Order $order): Order
    {
        if (! $this->shouldAttemptPaymentReconciliation($order)) {
            return $order;
        }

        try {
            return $this->reconcilePendingOnlineOrder($order);
        } catch (\Throwable $exception) {
            Log::warning('Unable to reconcile pending online order payment.', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'message' => $exception->getMessage(),
            ]);

            return $order;
        }
    }

    protected function reconcilePendingOnlineOrder(Order $order): Order
    {
        $order->loadMissing('payment');

        $paymentIntentId = trim((string) $order->payment?->paymongo_payment_intent_id);
        $paymentId = trim((string) $order->paymongo_payment_id);

        if ($paymentId !== '') {
            $paymentPayload = $this->payMongoService->retrievePayment($paymentId);
            $paymentResource = data_get($paymentPayload, 'data');
            $paymentStatus = strtolower((string) data_get($paymentResource, 'attributes.status', ''));

            if ($paymentStatus === 'paid' && is_array($paymentResource)) {
                return $this->markPaymentPaid(
                    $paymentResource,
                    'payment_retrieved',
                    'Payment confirmed after PayMongo reconciliation.'
                ) ?? $order;
            }

            if (in_array($paymentStatus, ['failed', 'cancelled'], true) && is_array($paymentResource)) {
                return $this->markPaymentFailed(
                    $paymentResource,
                    'payment_retrieved',
                    'Payment failed after PayMongo reconciliation.'
                ) ?? $order;
            }
        }

        if ($paymentIntentId !== '') {
            $paymentIntentPayload = $this->payMongoService->retrievePaymentIntent($paymentIntentId);
            $paymentIntentResource = data_get($paymentIntentPayload, 'data');
            $paymentIntentStatus = strtolower((string) data_get($paymentIntentResource, 'attributes.status', ''));
            $paymentResource = $this->extractPaymentIntentPayment($paymentIntentResource);
            $paymentStatus = strtolower((string) data_get($paymentResource, 'attributes.status', ''));

            if ($paymentStatus === 'paid' && is_array($paymentResource)) {
                return $this->markPaymentPaid(
                    $paymentResource,
                    'payment_intent_retrieved',
                    'Payment confirmed after PayMongo payment intent reconciliation.'
                ) ?? $order;
            }

            if (in_array($paymentStatus, ['failed', 'cancelled'], true) && is_array($paymentResource)) {
                return $this->markPaymentFailed(
                    $paymentResource,
                    'payment_intent_retrieved',
                    'Payment failed after PayMongo payment intent reconciliation.'
                ) ?? $order;
            }

            if ($paymentIntentStatus === 'succeeded' && is_array($paymentResource)) {
                return $this->markPaymentPaid(
                    $paymentResource,
                    'payment_intent_retrieved',
                    'Payment confirmed after PayMongo payment intent reconciliation.'
                ) ?? $order;
            }
        }

        $sourceId = trim((string) $order->payment?->paymongo_source_id);

        if ($sourceId === '') {
            return $order;
        }

        $sourcePayload = $this->payMongoService->retrieveSource($sourceId);
        $sourceResource = data_get($sourcePayload, 'data');
        $sourceStatus = strtolower((string) data_get($sourceResource, 'attributes.status', ''));

        if ($sourceStatus === 'chargeable' && is_array($sourceResource)) {
            return $this->handleChargeableSource($sourceResource, 'source_retrieved') ?? $order;
        }

        if (in_array($sourceStatus, ['failed', 'cancelled', 'expired'], true) && is_array($sourceResource)) {
            return $this->markSourceFailed($sourceResource) ?? $order;
        }

        return $order;
    }

    protected function extractPaymentIntentPayment(mixed $paymentIntentResource): ?array
    {
        $payments = data_get($paymentIntentResource, 'attributes.payments');

        if (! is_array($payments) || $payments === []) {
            return null;
        }

        $paymentResource = end($payments);

        if (! is_array($paymentResource)) {
            return null;
        }

        $paymentIntentId = trim((string) data_get($paymentIntentResource, 'id', ''));

        if ($paymentIntentId !== '' && blank(data_get($paymentResource, 'attributes.payment_intent_id'))) {
            data_set($paymentResource, 'attributes.payment_intent_id', $paymentIntentId);
        }

        return $paymentResource;
    }

    protected function extractCheckoutSessionPayment(mixed $checkoutSessionResource): ?array
    {
        $payments = data_get($checkoutSessionResource, 'attributes.payments');

        if (! is_array($payments) || $payments === []) {
            return null;
        }

        $paymentResource = end($payments);

        if (! is_array($paymentResource)) {
            return null;
        }

        $paymentIntentId = trim((string) data_get($checkoutSessionResource, 'attributes.payment_intent.id', ''));

        if ($paymentIntentId !== '' && blank(data_get($paymentResource, 'attributes.payment_intent_id'))) {
            data_set($paymentResource, 'attributes.payment_intent_id', $paymentIntentId);
        }

        return $paymentResource;
    }

    protected function shouldAttemptPaymentReconciliation(Order $order): bool
    {
        return in_array($order->payment_method, ['gcash', 'paymaya'], true)
            && ! in_array($order->payment_status, ['paid', 'failed', 'refunded'], true);
    }

    protected function shouldAutoCancelForFailedPayment(Order $order): bool
    {
        return in_array($order->order_status, ['pending', 'confirmed'], true);
    }

    protected function resolveSystemActorId(Order $order): int
    {
        $adminId = User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', 'admin'))
            ->value('id');

        return (int) ($adminId ?: $order->user_id);
    }

    protected function formatAmount(float $value): string
    {
        return number_format($value, 2, '.', '');
    }

    /**
     * @return array{cart: Cart, line_items: array<int, array{product: Product, quantity: int, selected_size: string, unit_price: string, subtotal: string}>, subtotal: float}
     */
    protected function resolveCartSnapshot(User $user, bool $lock = true): array
    {
        $cartQuery = Cart::query()->where('user_id', $user->id);

        if ($lock) {
            $cartQuery->lockForUpdate();
        }

        /** @var Cart|null $cart */
        $cart = $cartQuery->first();

        if (! $cart) {
            throw ValidationException::withMessages([
                'cart' => ['Your cart is empty.'],
            ]);
        }

        $cartItemsQuery = $cart->items();

        if ($lock) {
            $cartItemsQuery->lockForUpdate();
        }

        $cartItems = $cartItemsQuery->get();

        if ($cartItems->isEmpty()) {
            throw ValidationException::withMessages([
                'cart' => ['Your cart is empty.'],
            ]);
        }

        $productsQuery = Product::query()->whereIn('id', $cartItems->pluck('product_id')->all());

        if ($lock) {
            $productsQuery->lockForUpdate();
        }

        $products = $productsQuery->get()->keyBy('id');
        $lineItems = [];
        $subtotal = 0.0;

        foreach ($cartItems as $cartItem) {
            /** @var Product|null $product */
            $product = $products->get((int) $cartItem->product_id);

            if (! $product || ! $product->is_active) {
                throw ValidationException::withMessages([
                    'cart' => ['One or more cart items are no longer available.'],
                ]);
            }

            if ((int) $cartItem->quantity > (int) $product->stock_quantity) {
                throw ValidationException::withMessages([
                    'cart' => ['One or more cart items no longer have enough stock.'],
                ]);
            }

            $unitPrice = $product->currentPrice();
            $lineSubtotal = round($unitPrice * (int) $cartItem->quantity, 2);
            $subtotal += $lineSubtotal;

            $lineItems[] = [
                'product' => $product,
                'quantity' => (int) $cartItem->quantity,
                'selected_size' => trim((string) $cartItem->selected_size),
                'unit_price' => $this->formatAmount($unitPrice),
                'subtotal' => $this->formatAmount($lineSubtotal),
            ];
        }

        return [
            'cart' => $cart,
            'line_items' => $lineItems,
            'subtotal' => $subtotal,
        ];
    }

    protected function mergeGatewayPayload(mixed $existing, array $next): array
    {
        $payload = is_array($existing) ? $existing : [];

        return array_merge($payload, $next);
    }

    protected function loadOrder(int $orderId): Order
    {
        return Order::query()
            ->with($this->orderRelations())
            ->findOrFail($orderId);
    }

    protected function orderRelations(): array
    {
        return [
            'customer.roles',
            'rider.roles',
            'shippingAddress',
            'coupon',
            'items.product.primaryImage',
            'statusLogs.changedBy.roles',
            'payment',
        ];
    }
}
