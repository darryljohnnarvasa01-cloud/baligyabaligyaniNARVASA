<?php

namespace App\Services\Admin;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class AdminDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function getStats(): array
    {
        $today = now();
        $startOfDay = $today->copy()->startOfDay();
        $endOfDay = $today->copy()->endOfDay();

        $todayOrders = Order::query()
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->count();

        $todayRevenue = (float) Order::query()
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->whereNotIn('order_status', ['cancelled', 'refunded'])
            ->where(function ($query): void {
                $query
                    ->where('payment_status', 'paid')
                    ->orWhere('payment_method', 'cod');
            })
            ->sum('total_amount');

        $months = collect(range(5, 0, -1))
            ->map(function (int $offset): array {
                $date = now()->copy()->subMonths($offset)->startOfMonth();

                $revenue = (float) Order::query()
                    ->whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month)
                    ->whereNotIn('order_status', ['cancelled', 'refunded'])
                    ->where(function ($query): void {
                        $query
                            ->where('payment_status', 'paid')
                            ->orWhere('payment_method', 'cod');
                    })
                    ->sum('total_amount');

                return [
                    'month' => $date->format('M'),
                    'label' => $date->format('M Y'),
                    'revenue' => round($revenue, 2),
                ];
            })
            ->values()
            ->all();

        $topProducts = OrderItem::query()
            ->selectRaw('product_id, product_name, product_sku, SUM(quantity) as units_sold, SUM(subtotal) as revenue')
            ->whereHas('order', fn ($query) => $query->whereNotIn('order_status', ['cancelled', 'refunded']))
            ->groupBy('product_id', 'product_name', 'product_sku')
            ->orderByDesc('units_sold')
            ->limit(5)
            ->get()
            ->map(fn (OrderItem $item): array => [
                'product_id' => (int) $item->product_id,
                'product_name' => (string) $item->product_name,
                'product_sku' => (string) $item->product_sku,
                'units_sold' => (int) $item->units_sold,
                'revenue' => round((float) $item->revenue, 2),
            ])
            ->values()
            ->all();

        $recentOrders = OrderResource::collection(
            Order::query()
                ->with(['customer.roles', 'rider.roles', 'payment'])
                ->latest('id')
                ->limit(8)
                ->get()
        )->resolve();

        return [
            'today_orders' => $todayOrders,
            'today_revenue' => round($todayRevenue, 2),
            'total_products' => Product::query()->count(),
            'low_stock_count' => Product::query()
                ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                ->count(),
            'pending_orders' => Order::query()
                ->where('order_status', 'pending')
                ->count(),
            'monthly_revenue_chart' => $months,
            'top_products' => $topProducts,
            'recent_orders' => $recentOrders,
        ];
    }
}
