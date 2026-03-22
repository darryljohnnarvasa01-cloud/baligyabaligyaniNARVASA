<?php

namespace Tests\Feature\Store;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductTag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_products_endpoint_returns_paginated_catalog_with_filters(): void
    {
        $wholeBeans = $this->createCategory([
            'name' => 'Whole Beans',
            'slug' => 'whole-beans',
            'sort_order' => 1,
        ]);
        $groundCoffee = $this->createCategory([
            'name' => 'Ground Coffee',
            'slug' => 'ground-coffee',
            'sort_order' => 2,
        ]);

        $midnight = $this->createProduct($wholeBeans, [
            'name' => 'Midnight Reserve Blend',
            'slug' => 'midnight-reserve-blend',
            'sku' => 'BH-WB-001',
            'price' => 780.00,
            'sale_price' => 720.00,
            'stock_quantity' => 5,
            'low_stock_threshold' => 5,
            'is_featured' => true,
        ]);
        $this->attachMedia($midnight, ['Dark Roast']);

        $apo = $this->createProduct($wholeBeans, [
            'name' => 'Mt. Apo Estate 250g',
            'slug' => 'mt-apo-estate-250g',
            'sku' => 'BH-WB-002',
            'price' => 640.00,
            'sale_price' => null,
            'stock_quantity' => 16,
            'low_stock_threshold' => 3,
            'is_featured' => true,
        ]);
        $this->attachMedia($apo, ['Single Origin']);

        $this->createProduct($wholeBeans, [
            'name' => 'Sagada Dawn Roast 250g',
            'slug' => 'sagada-dawn-roast-250g',
            'sku' => 'BH-WB-003',
            'is_featured' => false,
        ]);

        $this->createProduct($groundCoffee, [
            'name' => 'House Espresso Grind 250g',
            'slug' => 'house-espresso-grind-250g',
            'sku' => 'BH-GC-001',
            'is_featured' => true,
        ]);

        $this->createProduct($wholeBeans, [
            'name' => 'Hidden Product',
            'slug' => 'hidden-product',
            'sku' => 'BH-WB-004',
            'is_active' => false,
            'is_featured' => true,
        ]);

        $response = $this->getJson('/api/v1/products?category=whole-beans&featured=true&sort=price_asc&per_page=2');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.meta.current_page', 1)
            ->assertJsonPath('data.meta.per_page', 2)
            ->assertJsonPath('data.meta.total', 2)
            ->assertJsonPath('data.items.0.slug', 'mt-apo-estate-250g')
            ->assertJsonPath('data.items.1.slug', 'midnight-reserve-blend')
            ->assertJsonPath('data.items.1.is_on_sale', true)
            ->assertJsonPath('data.items.1.sale_percentage', 8)
            ->assertJsonPath('data.items.1.stock_status', 'low_stock');
    }

    public function test_public_product_detail_returns_product_and_related_products(): void
    {
        $wholeBeans = $this->createCategory([
            'name' => 'Whole Beans',
            'slug' => 'whole-beans',
        ]);
        $equipment = $this->createCategory([
            'name' => 'Brewing Equipment',
            'slug' => 'brewing-equipment',
            'sort_order' => 2,
        ]);

        $target = $this->createProduct($wholeBeans, [
            'name' => 'Midnight Reserve Blend',
            'slug' => 'midnight-reserve-blend',
            'sku' => 'BH-WB-001',
            'sale_price' => 720.00,
            'is_featured' => true,
        ]);
        $this->attachMedia($target, ['Dark Roast', 'Best Seller']);

        foreach (range(2, 6) as $index) {
            $product = $this->createProduct($wholeBeans, [
                'name' => 'Related Product '.$index,
                'slug' => 'related-product-'.$index,
                'sku' => 'BH-WB-00'.$index,
                'is_featured' => $index % 2 === 0,
            ]);

            $this->attachMedia($product, ['Featured']);
        }

        $outsideCategory = $this->createProduct($equipment, [
            'name' => 'Kettle',
            'slug' => 'precision-gooseneck-kettle',
            'sku' => 'BH-BE-001',
        ]);
        $this->attachMedia($outsideCategory, ['Equipment']);

        $response = $this->getJson('/api/v1/products/midnight-reserve-blend');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product.slug', 'midnight-reserve-blend')
            ->assertJsonPath('data.product.primary_image.is_primary', true)
            ->assertJsonPath('data.product.tags.0.name', 'Best Seller')
            ->assertJsonCount(4, 'data.related_products');

        $relatedSlugs = collect($response->json('data.related_products'))->pluck('slug')->all();

        $this->assertCount(4, $relatedSlugs);
        $this->assertNotContains('midnight-reserve-blend', $relatedSlugs);
        $this->assertNotContains('precision-gooseneck-kettle', $relatedSlugs);
    }

    public function test_public_categories_endpoint_returns_active_categories_with_product_counts(): void
    {
        $wholeBeans = $this->createCategory([
            'name' => 'Whole Beans',
            'slug' => 'whole-beans',
            'sort_order' => 1,
        ]);
        $merchandise = $this->createCategory([
            'name' => 'Merchandise',
            'slug' => 'merchandise',
            'sort_order' => 2,
        ]);
        $this->createCategory([
            'name' => 'Hidden Category',
            'slug' => 'hidden-category',
            'is_active' => false,
            'sort_order' => 3,
        ]);

        $this->createProduct($wholeBeans, [
            'name' => 'Midnight Reserve Blend',
            'slug' => 'midnight-reserve-blend',
            'sku' => 'BH-WB-001',
            'is_active' => true,
        ]);
        $this->createProduct($wholeBeans, [
            'name' => 'Archived Beans',
            'slug' => 'archived-beans',
            'sku' => 'BH-WB-002',
            'is_active' => false,
        ]);
        $this->createProduct($merchandise, [
            'name' => 'BrewHaus Enamel Mug',
            'slug' => 'brewhaus-enamel-mug',
            'sku' => 'BH-MR-001',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/categories');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.slug', 'whole-beans')
            ->assertJsonPath('data.0.product_count', 1)
            ->assertJsonPath('data.1.slug', 'merchandise')
            ->assertJsonPath('data.1.product_count', 1);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createCategory(array $attributes): Category
    {
        return Category::query()->create(array_merge([
            'name' => 'Category',
            'slug' => 'category',
            'description' => 'Category description.',
            'image' => 'categories/category.jpg',
            'is_active' => true,
            'sort_order' => 1,
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createProduct(Category $category, array $attributes): Product
    {
        return Product::query()->create(array_merge([
            'category_id' => $category->id,
            'name' => 'Product',
            'slug' => 'product',
            'short_description' => 'Short description.',
            'description' => 'Full description.',
            'price' => 500.00,
            'sale_price' => null,
            'sku' => 'BH-SKU-001',
            'stock_quantity' => 12,
            'low_stock_threshold' => 4,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ], $attributes));
    }

    /**
     * @param  array<int, string>  $tags
     */
    private function attachMedia(Product $product, array $tags): void
    {
        $product->images()->createMany([
            [
                'image_path' => 'products/'.$product->slug.'/primary.jpg',
                'alt_text' => $product->name.' primary image',
                'sort_order' => 1,
                'is_primary' => true,
            ],
            [
                'image_path' => 'products/'.$product->slug.'/detail.jpg',
                'alt_text' => $product->name.' detail image',
                'sort_order' => 2,
                'is_primary' => false,
            ],
        ]);

        $tagIds = collect($tags)
            ->map(function (string $tagName): int {
                return ProductTag::query()->firstOrCreate([
                    'slug' => str($tagName)->slug()->toString(),
                ], [
                    'name' => $tagName,
                ])->id;
            })
            ->all();

        $product->tags()->sync($tagIds);
    }
}
