<?php

namespace App\Repositories;

use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class OrderRepository
{
    /**
     * @param  array{status?: string|null, payment_status?: string|null, method?: string|null, date_from?: string|null, date_to?: string|null, per_page?: int|null}  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return Order::query()
            ->with($this->adminRelations())
            ->when(! empty($filters['status']), fn ($query) => $query->where('order_status', $filters['status']))
            ->when(! empty($filters['payment_status']), fn ($query) => $query->where('payment_status', $filters['payment_status']))
            ->when(! empty($filters['method']), fn ($query) => $query->where('payment_method', $filters['method']))
            ->when(! empty($filters['date_from']), fn ($query) => $query->whereDate('created_at', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($query) => $query->whereDate('created_at', '<=', $filters['date_to']))
            ->latest('id')
            ->paginate($perPage);
    }

    public function findOrFail(int $id): Order
    {
        return Order::query()->findOrFail($id);
    }

    public function findForAdminOrFail(int $id): Order
    {
        return Order::query()
            ->with($this->adminRelations())
            ->findOrFail($id);
    }

    /**
     * @param  array{status?: string|null, per_page?: int|null}  $filters
     */
    public function paginateForCustomer(int $customerId, array $filters = []): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 10), 50));

        return Order::query()
            ->where('user_id', $customerId)
            ->with(['rider', 'payment', 'coupon', 'items.product.primaryImage'])
            ->when(! empty($filters['status']), fn ($query) => $query->where('order_status', $filters['status']))
            ->latest('id')
            ->paginate($perPage);
    }

    public function findForCustomerOrFail(int $id, int $customerId): Order
    {
        return Order::query()
            ->where('user_id', $customerId)
            ->with(['customer', 'rider', 'payment', 'shippingAddress', 'coupon', 'items.product.primaryImage', 'statusLogs.changedBy'])
            ->findOrFail($id);
    }

    public function findForCustomerBasicOrFail(int $id, int $customerId): Order
    {
        return Order::query()
            ->where('user_id', $customerId)
            ->findOrFail($id);
    }

    /**
     * @return Collection<int, Order>
     */
    public function listForRider(int $riderId): Collection
    {
        return Order::query()
            ->where('rider_id', $riderId)
            ->whereIn('order_status', ['packed', 'shipped', 'out_for_delivery'])
            ->with(['customer', 'shippingAddress', 'items.product.primaryImage', 'payment'])
            ->latest('id')
            ->get();
    }

    /**
     * @return Collection<int, Order>
     */
    public function listHistoryForRider(int $riderId): Collection
    {
        return Order::query()
            ->where('rider_id', $riderId)
            ->where('order_status', 'delivered')
            ->with(['customer', 'shippingAddress', 'items.product.primaryImage', 'payment'])
            ->orderByDesc('delivered_at')
            ->orderByDesc('id')
            ->limit(20)
            ->get();
    }

    /**
     * @return Collection<int, Order>
     */
    public function listAvailableForRider(): Collection
    {
        return Order::query()
            ->whereNull('rider_id')
            ->whereIn('order_status', ['packed', 'shipped'])
            ->where(function ($query): void {
                $query
                    ->where('payment_method', 'cod')
                    ->orWhere('payment_status', 'paid');
            })
            ->with(['customer', 'shippingAddress', 'items.product.primaryImage', 'payment'])
            ->latest('id')
            ->get();
    }

    public function findForRiderOrFail(int $id, int $riderId): Order
    {
        $order = Order::query()
            ->with(['customer', 'rider', 'shippingAddress', 'items.product.primaryImage', 'payment', 'statusLogs.changedBy'])
            ->findOrFail($id);

        abort_if((int) $order->rider_id !== $riderId, 403, 'This order is not assigned to you.');

        return $order;
    }

    public function findForRiderBasicOrFail(int $id, int $riderId): Order
    {
        $order = Order::query()->findOrFail($id);

        abort_if((int) $order->rider_id !== $riderId, 403, 'This order is not assigned to you.');

        return $order;
    }

    public function findAvailableForRiderBasicOrFail(int $id): Order
    {
        return Order::query()
            ->whereNull('rider_id')
            ->whereIn('order_status', ['packed', 'shipped'])
            ->where(function ($query): void {
                $query
                    ->where('payment_method', 'cod')
                    ->orWhere('payment_status', 'paid');
            })
            ->findOrFail($id);
    }

    /**
     * @return array<int, string|array-key|callable>
     */
    protected function adminRelations(): array
    {
        return [
            'customer.roles',
            'rider.roles',
            'shippingAddress',
            'coupon',
            'payment',
            'items.product.primaryImage',
            'statusLogs' => fn ($query) => $query->oldest('id')->with('changedBy.roles'),
        ];
    }
}
