<?php

namespace App\Services\Admin;

use App\Models\Category;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class AdminCategoryService
{
    protected ImageManager $images;

    public function __construct()
    {
        $this->images = new ImageManager(new Driver());
    }

    public function create(array $payload): Category
    {
        return DB::transaction(function () use ($payload): Category {
            $category = Category::query()->create($this->extractAttributes($payload));

            if (($payload['image'] ?? null) instanceof UploadedFile) {
                $category->forceFill(['image' => $this->storeImage($category, $payload['image'])])->save();
            }

            return $category->fresh();
        });
    }

    public function update(Category $category, array $payload): Category
    {
        return DB::transaction(function () use ($category, $payload): Category {
            $category->fill($this->extractAttributes($payload, $category))->save();

            if (($payload['image'] ?? null) instanceof UploadedFile) {
                if ($category->image) {
                    Storage::disk('public')->delete($category->image);
                }

                $category->forceFill(['image' => $this->storeImage($category, $payload['image'])])->save();
            }

            return $category->fresh();
        });
    }

    public function delete(Category $category): void
    {
        DB::transaction(function () use ($category): void {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }

            $category->delete();
        });
    }

    protected function extractAttributes(array $payload, ?Category $category = null): array
    {
        return [
            'name' => (string) $payload['name'],
            'slug' => $this->ensureUniqueSlug((string) $payload['slug'], $category?->id),
            'description' => $payload['description'] ?? null,
            'is_active' => (bool) ($payload['is_active'] ?? true),
            'sort_order' => (int) ($payload['sort_order'] ?? 0),
        ];
    }

    protected function ensureUniqueSlug(string $slug, ?int $ignoreId = null): string
    {
        $base = Str::slug($slug) ?: Str::uuid()->toString();
        $candidate = $base;
        $suffix = 1;

        while (Category::query()
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('slug', $candidate)
            ->exists()) {
            $candidate = $base.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    protected function storeImage(Category $category, UploadedFile $file): string
    {
        $directory = 'categories';
        $path = $directory.'/'.($category->slug ?: Str::uuid()).'-'.Str::uuid().'.jpg';
        $image = $this->images->read($file->getRealPath())->cover(1200, 800);
        Storage::disk('public')->put($path, (string) $image->toJpeg(85));

        return $path;
    }
}
