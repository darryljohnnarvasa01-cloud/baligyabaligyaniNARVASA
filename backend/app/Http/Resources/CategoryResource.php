<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ResolvesPublicAssetUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Category
 */
class CategoryResource extends JsonResource
{
    use ResolvesPublicAssetUrls;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $image = $this->image;
        $imageUrl = $this->resolvePublicAssetUrl($image);

        return [
            'id' => (int) $this->id,
            'name' => (string) $this->name,
            'slug' => (string) $this->slug,
            'description' => $this->description,
            'image' => $image,
            'image_url' => $imageUrl,
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
            'product_count' => (int) ($this->product_count ?? 0),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
