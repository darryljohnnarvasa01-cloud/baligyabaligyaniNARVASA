<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin array<string, mixed>
 */
class DashboardStatsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'today_orders' => (int) ($this['today_orders'] ?? 0),
            'today_revenue' => (float) ($this['today_revenue'] ?? 0),
            'total_products' => (int) ($this['total_products'] ?? 0),
            'low_stock_count' => (int) ($this['low_stock_count'] ?? 0),
            'pending_orders' => (int) ($this['pending_orders'] ?? 0),
            'monthly_revenue_chart' => array_values($this['monthly_revenue_chart'] ?? []),
            'top_products' => array_values($this['top_products'] ?? []),
            'recent_orders' => array_values($this['recent_orders'] ?? []),
        ];
    }
}
