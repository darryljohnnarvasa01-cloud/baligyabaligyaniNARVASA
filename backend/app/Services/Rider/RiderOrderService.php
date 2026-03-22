<?php

namespace App\Services\Rider;

use App\Models\Order;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Repositories\OrderRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RiderOrderService
{
    private const BASE_DELIVERY_RATE = 60.0;

    private const COD_BONUS_RATE = 15.0;

    public function __construct(private readonly OrderRepository $orders)
    {
    }

    /**
     * Claim an available delivery from the rider queue.
     *
     * @throws ValidationException
     */
    public function accept(Order $order, int $riderId, ?string $note = null): Order
    {
        if ($order->rider_id !== null) {
            throw ValidationException::withMessages([
                'order_id' => ['This delivery has already been claimed by another rider.'],
            ]);
        }

        if (! in_array($order->order_status, ['packed', 'shipped'], true)) {
            throw ValidationException::withMessages([
                'order_status' => ['Only packed or shipped orders can be accepted.'],
            ]);
        }

        DB::transaction(function () use ($order, $riderId, $note): void {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! in_array($lockedOrder->order_status, ['packed', 'shipped'], true)) {
                throw ValidationException::withMessages([
                    'order_status' => ['Only packed or shipped orders can be accepted.'],
                ]);
            }

            if ($lockedOrder->rider_id !== null) {
                throw ValidationException::withMessages([
                    'order_id' => ['This delivery has already been claimed by another rider.'],
                ]);
            }

            $this->ensureOrderCanEnterDeliveryFlow($lockedOrder);

            $lockedOrder->forceFill([
                'rider_id' => $riderId,
            ])->save();

            $lockedOrder->statusLogs()->create([
                'order_status' => $lockedOrder->order_status,
                'changed_by' => $riderId,
                'note' => $note ?: 'Rider accepted the delivery from the queue.',
            ]);
        });

        return $this->orders->findForRiderOrFail((int) $order->id, $riderId);
    }

    /**
     * Mark a rider-assigned order as out for delivery.
     *
     * @throws ValidationException
     */
    public function pickup(Order $order, int $changedBy): Order
    {
        if (! in_array($order->order_status, ['packed', 'shipped'], true)) {
            throw ValidationException::withMessages([
                'order_status' => ['Only packed or shipped orders can be picked up.'],
            ]);
        }

        DB::transaction(function () use ($order, $changedBy): void {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! in_array($lockedOrder->order_status, ['packed', 'shipped'], true)) {
                throw ValidationException::withMessages([
                    'order_status' => ['Only packed or shipped orders can be picked up.'],
                ]);
            }

            $this->ensureOrderCanEnterDeliveryFlow($lockedOrder);

            $lockedOrder->forceFill([
                'order_status' => 'out_for_delivery',
                'shipped_at' => $lockedOrder->shipped_at ?? now(),
            ])->save();

            $lockedOrder->statusLogs()->create([
                'order_status' => 'out_for_delivery',
                'changed_by' => $changedBy,
                'note' => 'Rider marked the order as picked up.',
            ]);
        });

        return $this->orders->findForRiderOrFail((int) $order->id, $changedBy);
    }

    /**
     * Mark an out-for-delivery order as delivered.
     *
     * @throws ValidationException
     */
    public function deliver(
        Order $order,
        int $changedBy,
        ?string $deliveryNote = null,
        ?UploadedFile $proofImage = null,
    ): Order
    {
        if ($order->order_status !== 'out_for_delivery') {
            throw ValidationException::withMessages([
                'order_status' => ['Only orders out for delivery can be delivered.'],
            ]);
        }

        if (! $proofImage instanceof UploadedFile && ! filled($order->delivery_proof_path)) {
            throw ValidationException::withMessages([
                'proof_image' => ['A proof-of-delivery photo is required before completing this order.'],
            ]);
        }

        DB::transaction(function () use ($order, $changedBy, $deliveryNote, $proofImage): void {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->order_status !== 'out_for_delivery') {
                throw ValidationException::withMessages([
                    'order_status' => ['Only orders out for delivery can be delivered.'],
                ]);
            }

            $this->ensureOrderCanEnterDeliveryFlow($lockedOrder);

            $lockedOrder->forceFill([
                'order_status' => 'delivered',
                'delivered_at' => now(),
                'delivery_proof_path' => $proofImage instanceof UploadedFile
                    ? $this->storeProofImage($lockedOrder, $proofImage)
                    : $lockedOrder->delivery_proof_path,
                'delivery_proof_notes' => $deliveryNote ?: $lockedOrder->delivery_proof_notes,
            ])->save();

            $lockedOrder->statusLogs()->create([
                'order_status' => 'delivered',
                'changed_by' => $changedBy,
                'note' => $deliveryNote
                    ? 'Rider marked the order as delivered. '.$deliveryNote
                    : 'Rider marked the order as delivered.',
            ]);
        });

        return $this->orders->findForRiderOrFail((int) $order->id, $changedBy);
    }

    /**
     * Upload or replace a proof-of-delivery photo before completion.
     *
     * @throws ValidationException
     */
    public function uploadProof(Order $order, int $changedBy, UploadedFile $proofImage): Order
    {
        if ($order->order_status !== 'out_for_delivery') {
            throw ValidationException::withMessages([
                'order_status' => ['Proof of delivery can only be uploaded while the order is out for delivery.'],
            ]);
        }

        DB::transaction(function () use ($order, $changedBy, $proofImage): void {
            $order->forceFill([
                'delivery_proof_path' => $this->storeProofImage($order, $proofImage),
            ])->save();

            $order->statusLogs()->create([
                'order_status' => $order->order_status,
                'changed_by' => $changedBy,
                'note' => 'Rider uploaded a delivery proof photo.',
            ]);
        });

        return $this->orders->findForRiderOrFail((int) $order->id, $changedBy);
    }

    public function reportIssue(Order $order, int $changedBy, string $issueType, ?string $details = null): Order
    {
        $issueLabel = Str::of($issueType)->replace('_', ' ')->title()->value();
        $note = 'Rider issue reported: '.$issueLabel.'.';

        if ($details) {
            $note .= ' '.trim($details);
        }

        $order->statusLogs()->create([
            'order_status' => $order->order_status,
            'changed_by' => $changedBy,
            'note' => $note,
        ]);

        return $this->orders->findForRiderOrFail((int) $order->id, $changedBy);
    }

    /**
     * @return array<string, int|float>
     */
    public function buildSummary(int $riderId): array
    {
        $activeOrders = Order::query()
            ->where('rider_id', $riderId)
            ->whereIn('order_status', ['packed', 'shipped', 'out_for_delivery'])
            ->get(['payment_method', 'total_amount']);

        $deliveredToday = Order::query()
            ->where('rider_id', $riderId)
            ->where('order_status', 'delivered')
            ->whereDate('delivered_at', today())
            ->get(['payment_method']);

        $deliveredTotal = Order::query()
            ->where('rider_id', $riderId)
            ->where('order_status', 'delivered')
            ->get(['payment_method']);

        $estimatePayout = static function (string $paymentMethod): float {
            return self::BASE_DELIVERY_RATE + ($paymentMethod === 'cod' ? self::COD_BONUS_RATE : 0.0);
        };

        return [
            'active_runs' => $activeOrders->count(),
            'queue_open' => $this->orders->listAvailableForRider()->count(),
            'delivered_today' => $deliveredToday->count(),
            'delivered_total' => $deliveredTotal->count(),
            'cod_to_collect' => round(
                (float) $activeOrders
                    ->where('payment_method', 'cod')
                    ->sum(fn (Order $activeOrder) => (float) $activeOrder->total_amount),
                2
            ),
            'estimated_earnings_today' => round(
                (float) $deliveredToday->sum(
                    fn (Order $deliveredOrder) => $estimatePayout((string) $deliveredOrder->payment_method)
                ),
                2
            ),
            'estimated_earnings_total' => round(
                (float) $deliveredTotal->sum(
                    fn (Order $deliveredOrder) => $estimatePayout((string) $deliveredOrder->payment_method)
                ),
                2
            ),
        ];
    }

    protected function storeProofImage(Order $order, UploadedFile $proofImage): string
    {
        if ($order->delivery_proof_path && Storage::disk('public')->exists($order->delivery_proof_path)) {
            Storage::disk('public')->delete($order->delivery_proof_path);
        }

        return $proofImage->store('delivery-proofs/'.$order->id, 'public');
    }

    protected function ensureOrderCanEnterDeliveryFlow(Order $order): void
    {
        if ($order->payment_method === 'cod' || $order->payment_status === 'paid') {
            return;
        }

        throw ValidationException::withMessages([
            'payment_status' => ['Online orders must be paid before they can be dispatched or delivered.'],
        ]);
    }
}
