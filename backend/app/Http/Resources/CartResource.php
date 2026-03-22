<?php

namespace App\Http\Resources;

use App\Models\CartItem;
use App\Http\Resources\Concerns\ResolvesPublicAssetUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Cart
 */
class CartResource extends JsonResource
{
    use ResolvesPublicAssetUrls;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $items = $this->relationLoaded('items')
            ? $this->items->map(fn (CartItem $item): array => $this->transformItem($item))->values()->all()
            : [];

        return [
            'id' => (int) $this->id,
            'user_id' => $this->user_id ? (int) $this->user_id : null,
            'session_id' => $this->session_id,
            'items' => $items,
            'item_count' => (int) collect($items)->sum('quantity'),
            'subtotal' => (float) number_format(
                collect($items)->sum(fn (array $item): float => (float) $item['subtotal']),
                2,
                '.',
                ''
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformItem(CartItem $item): array
    {
        $product = $item->product;
        $primaryImage = $product?->primaryImage;
        $imagePath = $primaryImage?->image_path;

        return [
            'id' => (int) $item->id,
            'product_id' => (int) $item->product_id,
            'product_name' => $product?->name,
            'product_slug' => $product?->slug,
            'product_sku' => $product?->sku,
            'selected_size' => $item->selected_size !== '' ? (string) $item->selected_size : null,
            'quantity' => (int) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'subtotal' => (float) $item->subtotal(),
            'image_url' => $this->resolvePathToUrl($imagePath),
            'stock_status' => $product?->stockStatus(),
            'stock_quantity' => $product ? (int) $product->stock_quantity : 0,
            'is_active' => $product ? (bool) $product->is_active : false,
            'product' => $product ? [
                'id' => (int) $product->id,
                'name' => (string) $product->name,
                'slug' => (string) $product->slug,
                'category' => $product->relationLoaded('category') && $product->category ? [
                    'id' => (int) $product->category->id,
                    'name' => (string) $product->category->name,
                    'slug' => (string) $product->category->slug,
                ] : null,
            ] : null,
        ];
    }

    protected function resolvePathToUrl(?string $path): ?string
    {
        return $this->resolvePublicAssetUrl($path);
    }
}
