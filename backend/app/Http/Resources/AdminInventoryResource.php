<?php

namespace App\Http\Resources;

use App\Models\InventoryLog;
use App\Http\Resources\Concerns\ResolvesPublicAssetUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
class AdminInventoryResource extends JsonResource
{
    use ResolvesPublicAssetUrls;

    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => (string) $this->name,
            'sku' => (string) $this->sku,
            'stock_quantity' => (int) $this->stock_quantity,
            'low_stock_threshold' => (int) $this->low_stock_threshold,
            'stock_status' => $this->stockStatus(),
            'is_active' => (bool) $this->is_active,
            'current_price' => $this->currentPrice(),
            'primary_image' => $this->whenLoaded('primaryImage', function (): ?array {
                if (! $this->primaryImage) {
                    return null;
                }

                return [
                    'id' => (int) $this->primaryImage->id,
                    'image_path' => (string) $this->primaryImage->image_path,
                    'image_url' => $this->resolvePathToUrl($this->primaryImage->image_path),
                ];
            }),
            'inventory_logs' => $this->whenLoaded('inventoryLogs', fn () => $this->inventoryLogs
                ->map(fn (InventoryLog $log): array => [
                    'id' => (int) $log->id,
                    'type' => (string) $log->type,
                    'adjustment_type' => $log->adjustment_type,
                    'quantity_change' => (int) $log->quantity_change,
                    'quantity_after' => (int) $log->quantity_after,
                    'reference_id' => $log->reference_id,
                    'reference_type' => $log->reference_type,
                    'note' => $log->note,
                    'created_at' => $log->created_at?->toIso8601String(),
                    'created_by' => $log->relationLoaded('createdBy') && $log->createdBy
                        ? [
                            'id' => (int) $log->createdBy->id,
                            'name' => (string) $log->createdBy->name,
                        ]
                        : null,
                ])
                ->values()
                ->all()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    protected function resolvePathToUrl(?string $path): ?string
    {
        return $this->resolvePublicAssetUrl($path);
    }
}
