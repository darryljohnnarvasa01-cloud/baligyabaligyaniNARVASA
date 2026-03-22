<?php

namespace App\Repositories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class UserRepository
{
    /**
     * @return Collection<int, User>
     */
    public function getAvailableRiders(): Collection
    {
        $activeRiderIds = Order::query()
            ->whereNotNull('rider_id')
            ->where('order_status', 'out_for_delivery')
            ->pluck('rider_id')
            ->unique()
            ->filter()
            ->values()
            ->all();

        return User::query()
            ->role('rider', 'sanctum')
            ->where('is_active', true)
            ->when(count($activeRiderIds) > 0, fn ($query) => $query->whereNotIn('id', $activeRiderIds))
            ->orderBy('name')
            ->get();
    }

    public function findActiveRiderById(int $id): ?User
    {
        return User::query()
            ->role('rider', 'sanctum')
            ->where('is_active', true)
            ->whereKey($id)
            ->first();
    }

    /**
     * @param  array{role?: string|null, search?: string|null, per_page?: int|null}  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 12), 100));
        $role = $filters['role'] ?? null;
        $search = $filters['search'] ?? null;

        return User::query()
            ->with('roles')
            ->withCount(['orders', 'assignedOrders'])
            ->when(is_string($role) && $role !== '', fn ($query) => $query->role($role, 'sanctum'))
            ->when(is_string($search) && trim($search) !== '', function ($query) use ($search): void {
                $search = trim($search);
                $query->where(function ($nested) use ($search): void {
                    $nested
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('phone', 'like', '%'.$search.'%');
                });
            })
            ->latest('id')
            ->paginate($perPage);
    }
}
