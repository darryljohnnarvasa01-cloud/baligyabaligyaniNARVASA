<?php

namespace App\Services\Admin;

use App\Models\Order;
use App\Models\Payment;
use App\Services\CouponService;
use App\Repositories\OrderRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminOrderService
{
    public const STATUSES = [
        'pending',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
    ];

    public function __construct(
        private readonly OrderRepository $orders,
        private readonly UserRepository $users,
        private readonly CouponService $coupons,
        private readonly AdminInventoryService $inventory,
    ) {
    }

    public function updateStatus(Order $order, string $status, ?string $note, ?int $changedBy): Order
    {
        if (! in_array($status, self::STATUSES, true)) {
            throw ValidationException::withMessages([
                'order_status' => ['The selected order status is invalid.'],
            ]);
        }

        if (in_array($status, ['out_for_delivery', 'delivered'], true) && ! $order->rider_id) {
            throw ValidationException::withMessages([
                'order_status' => ['Assign a rider before using this delivery status.'],
            ]);
        }

        return DB::transaction(function () use ($order, $status, $note, $changedBy): Order {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            $this->ensureOrderCanEnterFulfillment($lockedOrder, $status);

            if (in_array($lockedOrder->order_status, ['cancelled', 'refunded'], true) && ! in_array($status, ['cancelled', 'refunded'], true)) {
                throw ValidationException::withMessages([
                    'order_status' => ['Cancelled or refunded orders cannot move back into the active flow.'],
                ]);
            }

            if (in_array($status, ['cancelled', 'refunded'], true) && ! in_array($lockedOrder->order_status, ['cancelled', 'refunded'], true)) {
                $this->restoreStock($lockedOrder, $changedBy);
                $this->coupons->releaseUsage($lockedOrder);
            }

            $lockedOrder->forceFill([
                'order_status' => $status,
                'shipped_at' => in_array($status, ['shipped', 'out_for_delivery', 'delivered'], true)
                    ? ($lockedOrder->shipped_at ?? now())
                    : $lockedOrder->shipped_at,
                'delivered_at' => $status === 'delivered' ? now() : null,
                'cancelled_at' => $status === 'cancelled' ? now() : ($status === 'refunded' ? ($lockedOrder->cancelled_at ?? now()) : null),
            ])->save();

            if ($status === 'refunded') {
                $lockedOrder->forceFill(['payment_status' => 'refunded'])->save();
                Payment::query()->where('order_id', $lockedOrder->id)->update(['status' => 'failed']);
            }

            $lockedOrder->statusLogs()->create([
                'order_status' => $status,
                'changed_by' => $changedBy,
                'note' => $note,
            ]);

            return $this->orders->findForAdminOrFail((int) $lockedOrder->id);
        });
    }

    public function assignRider(Order $order, int $riderId, ?string $note, ?int $changedBy): Order
    {
        $rider = $this->users->findActiveRiderById($riderId);

        if (! $rider) {
            throw ValidationException::withMessages([
                'rider_id' => ['The selected rider is invalid or inactive.'],
            ]);
        }

        if (in_array($order->order_status, ['cancelled', 'refunded', 'delivered'], true)) {
            throw ValidationException::withMessages([
                'rider_id' => ['A rider cannot be assigned to a completed or cancelled order.'],
            ]);
        }

        return DB::transaction(function () use ($order, $riderId, $note, $changedBy): Order {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            $this->ensureOrderCanAssignRider($lockedOrder);

            $lockedOrder->forceFill([
                'rider_id' => $riderId,
                'order_status' => in_array($lockedOrder->order_status, ['pending', 'confirmed', 'processing'], true)
                    ? 'packed'
                    : $lockedOrder->order_status,
            ])->save();

            $lockedOrder->statusLogs()->create([
                'order_status' => $lockedOrder->order_status,
                'changed_by' => $changedBy,
                'note' => $note ?: 'Rider assigned by admin.',
            ]);

            return $this->orders->findForAdminOrFail((int) $lockedOrder->id);
        });
    }

    protected function restoreStock(Order $order, ?int $changedBy): void
    {
        $order->loadMissing('items.product');

        foreach ($order->items as $item) {
            if (! $item->product) {
                continue;
            }

            $this->inventory->restoreStock(
                $item->product,
                (int) $item->quantity,
                'Stock restored after admin status update to '.$order->order_status.'.',
                (int) $changedBy,
                (int) $order->id,
                'return'
            );
        }
    }

    protected function ensureOrderCanEnterFulfillment(Order $order, string $nextStatus): void
    {
        if (! in_array($nextStatus, ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'], true)) {
            return;
        }

        if ($order->payment_method === 'cod' || $order->payment_status === 'paid') {
            return;
        }

        throw ValidationException::withMessages([
            'payment_status' => ['Online orders must be paid before they can move into fulfillment or delivery.'],
        ]);
    }

    protected function ensureOrderCanAssignRider(Order $order): void
    {
        if ($order->payment_method === 'cod' || $order->payment_status === 'paid') {
            return;
        }

        throw ValidationException::withMessages([
            'payment_status' => ['Online orders must be paid before a rider can be assigned.'],
        ]);
    }
}
