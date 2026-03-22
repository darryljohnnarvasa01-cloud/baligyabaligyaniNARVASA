<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Builder;

class ProductCatalogService
{
    public function getPaginatedProducts(array $filters): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? 12);
        $sort = (string) ($filters['sort'] ?? 'newest');

        $query = $this->catalogQuery();

        if (! empty($filters['category'])) {
            $query->whereHas('category', function (Builder $categoryQuery) use ($filters): void {
                $categoryQuery->where('slug', $filters['category']);
            });
        }

        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);

            $query->where(function (Builder $searchQuery) use ($search): void {
                $searchQuery
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('short_description', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhere('sku', 'like', '%'.$search.'%');
            });
        }

        if (($filters['featured'] ?? false) === true) {
            $query->featured();
        }

        if (($filters['on_sale'] ?? false) === true) {
            $query->onSale();
        }

        $this->applySort($query, $sort);

        return $query->paginate($perPage);
    }

    public function findProductBySlug(string $slug): ?Product
    {
        return $this->catalogQuery()
            ->where('slug', $slug)
            ->first();
    }

    /**
     * @return Collection<int, Product>
     */
    public function getRelatedProducts(Product $product, int $limit = 4): Collection
    {
        return $this->catalogQuery()
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->getKey())
            ->orderByDesc('is_featured')
            ->latest('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, Category>
     */
    public function getActiveCategories(): Collection
    {
        return Category::query()
            ->active()
            ->withCount([
                'products as product_count' => function (Builder $productQuery): void {
                    $productQuery->active();
                },
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    protected function catalogQuery(): Builder
    {
        return Product::query()
            ->active()
            ->whereHas('category', function (Builder $categoryQuery): void {
                $categoryQuery->active();
            })
            ->with([
                'category',
                'primaryImage',
                'images' => function ($imageQuery): void {
                    $imageQuery->orderBy('sort_order')->orderBy('id');
                },
                'tags' => function ($tagQuery): void {
                    $tagQuery->orderBy('name');
                },
            ]);
    }

    protected function applySort(Builder $query, string $sort): void
    {
        if ($sort === 'price_asc') {
            $query
                ->orderByRaw('CASE WHEN sale_price IS NOT NULL AND sale_price < price THEN sale_price ELSE price END ASC')
                ->orderBy('id');

            return;
        }

        if ($sort === 'price_desc') {
            $query
                ->orderByRaw('CASE WHEN sale_price IS NOT NULL AND sale_price < price THEN sale_price ELSE price END DESC')
                ->orderByDesc('id');

            return;
        }

        if ($sort === 'popular') {
            $query
                ->withSum('orderItems as units_sold', 'quantity')
                ->orderByDesc('units_sold')
                ->latest('id');

            return;
        }

        $query->latest('id');
    }
}
