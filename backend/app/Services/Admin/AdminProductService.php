<?php

namespace App\Services\Admin;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductTag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class AdminProductService
{
    protected ImageManager $images;

    public function __construct()
    {
        $this->images = new ImageManager(new Driver());
    }

    public function create(array $payload): Product
    {
        return DB::transaction(function () use ($payload): Product {
            $product = Product::query()->create($this->extractProductAttributes($payload));

            $this->syncTags($product, $payload['tags'] ?? []);

            if (! empty($payload['images']) && is_array($payload['images'])) {
                $this->replaceImages($product, $payload['images'], (int) ($payload['primary_image_index'] ?? 0));
            }

            return $this->loadProduct((int) $product->id);
        });
    }

    public function update(Product $product, array $payload): Product
    {
        return DB::transaction(function () use ($product, $payload): Product {
            $attributes = $this->extractProductAttributes($payload, $product);
            unset($attributes['stock_quantity']);

            $product->fill($attributes)->save();

            if (array_key_exists('tags', $payload)) {
                $this->syncTags($product, $payload['tags'] ?? []);
            }

            if (! empty($payload['images']) && is_array($payload['images'])) {
                $this->replaceImages($product, $payload['images'], (int) ($payload['primary_image_index'] ?? 0));
            }

            return $this->loadProduct((int) $product->id);
        });
    }

    public function delete(Product $product): void
    {
        DB::transaction(function () use ($product): void {
            $product->loadMissing('images', 'tags');

            foreach ($product->images as $image) {
                Storage::disk('public')->delete($image->image_path);
            }

            $product->images()->delete();
            $product->tags()->detach();
            $product->delete();
        });
    }

    /**
     * @param  array<int, string>  $tags
     */
    protected function syncTags(Product $product, array $tags): void
    {
        $tagIds = collect($tags)
            ->map(fn ($tag) => trim((string) $tag))
            ->filter()
            ->unique()
            ->map(function (string $tag): int {
                $model = ProductTag::query()->firstOrCreate([
                    'slug' => Str::slug($tag),
                ], [
                    'name' => $tag,
                ]);

                return (int) $model->id;
            })
            ->values()
            ->all();

        $product->tags()->sync($tagIds);
    }

    /**
     * @param  array<int, UploadedFile>  $files
     */
    protected function replaceImages(Product $product, array $files, int $primaryIndex): void
    {
        $product->loadMissing('images');

        foreach ($product->images as $image) {
            Storage::disk('public')->delete($image->image_path);
        }

        $product->images()->delete();

        foreach (array_values($files) as $index => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $directory = 'products/'.$product->sku;
            $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $filename = sprintf('%02d-%s.%s', $index + 1, Str::uuid(), $extension === 'png' ? 'png' : 'jpg');
            $path = $directory.'/'.$filename;

            $image = $this->images->read($file->getRealPath())->cover(800, 800);
            $encoded = $extension === 'png' ? $image->toPng() : $image->toJpeg(85);
            Storage::disk('public')->put($path, (string) $encoded);

            $product->images()->create([
                'image_path' => $path,
                'alt_text' => $product->name.' image '.($index + 1),
                'sort_order' => $index,
                'is_primary' => $index === $primaryIndex,
            ]);
        }

        if (! $product->images()->where('is_primary', true)->exists()) {
            $product->images()->oldest('id')->limit(1)->update(['is_primary' => true]);
        }
    }

    protected function extractProductAttributes(array $payload, ?Product $product = null): array
    {
        return [
            'category_id' => (int) $payload['category_id'],
            'name' => (string) $payload['name'],
            'slug' => $this->ensureUniqueSlug((string) $payload['slug'], $product?->id),
            'short_description' => (string) $payload['short_description'],
            'description' => (string) $payload['description'],
            'price' => number_format((float) $payload['price'], 2, '.', ''),
            'sale_price' => array_key_exists('sale_price', $payload) && $payload['sale_price'] !== null && $payload['sale_price'] !== ''
                ? number_format((float) $payload['sale_price'], 2, '.', '')
                : null,
            'sku' => (string) $payload['sku'],
            'stock_quantity' => (int) ($payload['stock_quantity'] ?? 0),
            'low_stock_threshold' => (int) $payload['low_stock_threshold'],
            'weight_grams' => array_key_exists('weight_grams', $payload) && $payload['weight_grams'] !== null && $payload['weight_grams'] !== ''
                ? (int) $payload['weight_grams']
                : null,
            'size_options' => ! empty($payload['size_options']) && is_array($payload['size_options'])
                ? array_values($payload['size_options'])
                : null,
            'is_active' => (bool) ($payload['is_active'] ?? true),
            'is_featured' => (bool) ($payload['is_featured'] ?? false),
        ];
    }

    protected function ensureUniqueSlug(string $slug, ?int $ignoreId = null): string
    {
        $base = Str::slug($slug) ?: Str::uuid()->toString();
        $candidate = $base;
        $suffix = 1;

        while (Product::query()
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('slug', $candidate)
            ->exists()) {
            $candidate = $base.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    protected function loadProduct(int $productId): Product
    {
        return Product::query()
            ->with(['category', 'images', 'primaryImage', 'tags'])
            ->findOrFail($productId);
    }
}
