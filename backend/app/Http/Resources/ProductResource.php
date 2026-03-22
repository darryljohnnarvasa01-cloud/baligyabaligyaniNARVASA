<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ResolvesPublicAssetUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
class ProductResource extends JsonResource
{
    use ResolvesPublicAssetUrls;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $images = $this->relationLoaded('images')
            ? $this->images->map(fn ($image): array => $this->transformImage($image))->values()->all()
            : [];

        $primaryImage = $this->relationLoaded('primaryImage') && $this->primaryImage
            ? $this->transformImage($this->primaryImage)
            : ($images[0] ?? null);

        return [
            'id' => (int) $this->id,
            'category_id' => (int) $this->category_id,
            'name' => (string) $this->name,
            'slug' => (string) $this->slug,
            'short_description' => (string) $this->short_description,
            'description' => (string) $this->description,
            'price' => (float) $this->price,
            'sale_price' => $this->sale_price !== null ? (float) $this->sale_price : null,
            'current_price' => $this->currentPrice(),
            'sku' => (string) $this->sku,
            'stock_quantity' => (int) $this->stock_quantity,
            'low_stock_threshold' => (int) $this->low_stock_threshold,
            'weight_grams' => $this->weight_grams !== null ? (int) $this->weight_grams : null,
            'size_options' => collect($this->size_options ?? [])
                ->map(fn ($option): string => trim((string) $option))
                ->filter()
                ->values()
                ->all(),
            'is_active' => (bool) $this->is_active,
            'is_featured' => (bool) $this->is_featured,
            'is_on_sale' => $this->isOnSale(),
            'sale_percentage' => $this->salePercentage(),
            'stock_status' => $this->stockStatus(),
            'category' => $this->whenLoaded('category', function (): array {
                $categoryImage = $this->category->image;

                return [
                    'id' => (int) $this->category->id,
                    'name' => (string) $this->category->name,
                    'slug' => (string) $this->category->slug,
                    'image' => $categoryImage,
                    'image_url' => $this->resolvePathToUrl($categoryImage),
                ];
            }),
            'primary_image' => $primaryImage,
            'images' => $images,
            'tags' => $this->relationLoaded('tags')
                ? $this->tags->map(fn ($tag): array => [
                    'id' => (int) $tag->id,
                    'name' => (string) $tag->name,
                    'slug' => (string) $tag->slug,
                ])->values()->all()
                : [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @param  \App\Models\ProductImage  $image
     * @return array<string, mixed>
     */
    protected function transformImage($image): array
    {
        return [
            'id' => (int) $image->id,
            'image_path' => (string) $image->image_path,
            'image_url' => $this->resolvePathToUrl($image->image_path),
            'alt_text' => $image->alt_text,
            'sort_order' => (int) $image->sort_order,
            'is_primary' => (bool) $image->is_primary,
        ];
    }

    protected function resolvePathToUrl(?string $path): ?string
    {
        return $this->resolvePublicAssetUrl($path);
    }
}
