<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductTag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $categories = Category::query()->get()->keyBy('slug');

        $products = [
            [
                'category' => 'whole-beans',
                'name' => 'Midnight Reserve Blend',
                'slug' => 'midnight-reserve-blend',
                'short_description' => 'Dark chocolate, molasses, and a syrupy espresso finish.',
                'description' => 'Our house signature roast delivers dense body, bittersweet cocoa, and a long finish that cuts cleanly through milk. It is designed for late-night espresso service but stays balanced enough for pour over.',
                'price' => 780.00,
                'sale_price' => null,
                'sku' => 'BH-WB-001',
                'stock_quantity' => 30,
                'low_stock_threshold' => 8,
                'weight_grams' => 250,
                'is_active' => true,
                'is_featured' => true,
                'tags' => ['Dark Roast', 'Espresso', 'Best Seller'],
            ],
            [
                'category' => 'whole-beans',
                'name' => 'Mt. Apo Estate 250g',
                'slug' => 'mt-apo-estate-250g',
                'short_description' => 'Single-origin Davao beans with cacao nib and citrus zest.',
                'description' => 'A clean, high-elevation roast sourced from Mt. Apo farms and profiled to keep sweetness intact. Expect cacao nib, orange peel, and a polished finish that works beautifully for filter brewing.',
                'price' => 920.00,
                'sale_price' => null,
                'sku' => 'BH-WB-002',
                'stock_quantity' => 18,
                'low_stock_threshold' => 6,
                'weight_grams' => 250,
                'is_active' => true,
                'is_featured' => true,
                'tags' => ['Single Origin', 'Davao', 'Limited Release'],
            ],
            [
                'category' => 'whole-beans',
                'name' => 'Sagada Dawn Roast 250g',
                'slug' => 'sagada-dawn-roast-250g',
                'short_description' => 'Brown sugar sweetness with stone fruit lift.',
                'description' => 'This medium-dark Sagada profile leans sweet and aromatic, opening with toasted sugar and finishing with ripe plum. It is an all-arounder for home brewers who want brightness without giving up body.',
                'price' => 860.00,
                'sale_price' => null,
                'sku' => 'BH-WB-003',
                'stock_quantity' => 14,
                'low_stock_threshold' => 5,
                'weight_grams' => 250,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Highlands', 'Fruity', 'Filter Brew'],
            ],
            [
                'category' => 'whole-beans',
                'name' => 'Brazilian Cerrado 500g',
                'slug' => 'brazilian-cerrado-500g',
                'short_description' => 'Nutty, chocolate-forward beans in a larger value pack.',
                'description' => 'A dependable crowd-pleaser roasted for comfort and consistency. The larger 500g bag gives cafes and heavy home brewers a lower per-cup cost without sacrificing sweetness or crema.',
                'price' => 1380.00,
                'sale_price' => 1190.00,
                'sku' => 'BH-WB-004',
                'stock_quantity' => 12,
                'low_stock_threshold' => 4,
                'weight_grams' => 500,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Chocolate Notes', 'Value Pack', 'On Sale'],
            ],
            [
                'category' => 'ground-coffee',
                'name' => 'House Espresso Grind 250g',
                'slug' => 'house-espresso-grind-250g',
                'short_description' => 'Pre-ground espresso blend for easy home shots and moka pots.',
                'description' => 'Ground fresh for immediate use, this blend lands on roasted cacao, panela, and a rounded finish. It is calibrated for espresso machines, moka pots, and other fine-grind brewing methods.',
                'price' => 760.00,
                'sale_price' => null,
                'sku' => 'BH-GC-001',
                'stock_quantity' => 24,
                'low_stock_threshold' => 8,
                'weight_grams' => 250,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Espresso', 'House Blend', 'Daily Brew'],
            ],
            [
                'category' => 'ground-coffee',
                'name' => 'Davao Breakfast Grind 250g',
                'slug' => 'davao-breakfast-grind-250g',
                'short_description' => 'Smooth and mellow with toasted sugar and cashew.',
                'description' => 'This softer roast profile is built for drip brewers and slow mornings. It keeps acidity low, pushes sweetness forward, and gives an easy cup that still feels premium.',
                'price' => 690.00,
                'sale_price' => null,
                'sku' => 'BH-GC-002',
                'stock_quantity' => 16,
                'low_stock_threshold' => 6,
                'weight_grams' => 250,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Breakfast Blend', 'Smooth', 'Daily Brew'],
            ],
            [
                'category' => 'ground-coffee',
                'name' => 'Decaf Night Shift 250g',
                'slug' => 'decaf-night-shift-250g',
                'short_description' => 'Swiss-water decaf with cocoa, almond, and a clean finish.',
                'description' => 'A decaf that still tastes like serious coffee. Expect roasted almond, dark cocoa, and enough structure for an after-dinner cup without caffeine keeping the lights on.',
                'price' => 840.00,
                'sale_price' => 760.00,
                'sku' => 'BH-GC-003',
                'stock_quantity' => 7,
                'low_stock_threshold' => 5,
                'weight_grams' => 250,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Decaf', 'Cocoa', 'On Sale'],
            ],
            [
                'category' => 'brewing-equipment',
                'name' => 'V60 Dripper Matte Black',
                'slug' => 'v60-dripper-matte-black',
                'short_description' => 'A classic cone dripper finished in matte black ceramic.',
                'description' => 'The V60 remains the benchmark for hand-poured coffee. This matte black piece fits the Midnight Espresso look while giving experienced brewers full control over extraction and clarity.',
                'price' => 950.00,
                'sale_price' => null,
                'sku' => 'BH-BE-001',
                'stock_quantity' => 20,
                'low_stock_threshold' => 5,
                'weight_grams' => 220,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Manual Brew', 'Equipment', 'Essentials'],
            ],
            [
                'category' => 'brewing-equipment',
                'name' => 'Precision Gooseneck Kettle',
                'slug' => 'precision-gooseneck-kettle',
                'short_description' => 'Balanced stainless kettle for repeatable pour-over control.',
                'description' => 'A shop-grade kettle with a narrow neck and stable grip that lets you pour slowly and consistently. Ideal for home brewers dialing in bloom, pulse pours, and total brew time.',
                'price' => 2850.00,
                'sale_price' => null,
                'sku' => 'BH-BE-002',
                'stock_quantity' => 9,
                'low_stock_threshold' => 3,
                'weight_grams' => 650,
                'is_active' => true,
                'is_featured' => true,
                'tags' => ['Equipment', 'Pour Over', 'Featured'],
            ],
            [
                'category' => 'brewing-equipment',
                'name' => 'Burr Hand Grinder',
                'slug' => 'burr-hand-grinder',
                'short_description' => 'Portable burr grinder for travel kits and daily home use.',
                'description' => 'A durable hand grinder with stepped adjustment and uniform output for manual brewing. It is compact enough for travel and stable enough for consistent morning rituals.',
                'price' => 2190.00,
                'sale_price' => null,
                'sku' => 'BH-BE-003',
                'stock_quantity' => 11,
                'low_stock_threshold' => 4,
                'weight_grams' => 540,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Equipment', 'Travel', 'Manual Brew'],
            ],
            [
                'category' => 'brewing-equipment',
                'name' => 'Brew Scale Mini',
                'slug' => 'brew-scale-mini',
                'short_description' => 'Compact timer scale for accurate dose and yield tracking.',
                'description' => 'Precise coffee scales make repeatability possible. This compact unit tracks both time and weight, helping brewers lock in ratios for espresso, V60, or immersion brewing.',
                'price' => 1650.00,
                'sale_price' => null,
                'sku' => 'BH-BE-004',
                'stock_quantity' => 10,
                'low_stock_threshold' => 4,
                'weight_grams' => 320,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Equipment', 'Precision', 'Essentials'],
            ],
            [
                'category' => 'merchandise',
                'name' => 'BrewHaus Enamel Mug',
                'slug' => 'brewhaus-enamel-mug',
                'short_description' => 'Camp-style mug finished with the BrewHaus mark.',
                'description' => 'A durable enamel mug sized for morning pour-overs, afternoon americanos, or desk coffee that lasts too long. Designed to feel rugged without losing the premium brand edge.',
                'price' => 540.00,
                'sale_price' => null,
                'sku' => 'BH-MR-001',
                'stock_quantity' => 25,
                'low_stock_threshold' => 6,
                'weight_grams' => 300,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Merchandise', 'Giftable', 'Best Seller'],
            ],
            [
                'category' => 'merchandise',
                'name' => 'Midnight Espresso Tote',
                'slug' => 'midnight-espresso-tote',
                'short_description' => 'Heavy canvas tote built for beans, books, and market runs.',
                'description' => 'A structured canvas carry-all with understated BrewHaus branding. It fits a brew setup, laptop, or a week of beans without looking like generic cafe merch.',
                'price' => 680.00,
                'sale_price' => null,
                'sku' => 'BH-MR-002',
                'stock_quantity' => 18,
                'low_stock_threshold' => 5,
                'weight_grams' => 150,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Merchandise', 'Everyday Carry', 'Giftable'],
            ],
            [
                'category' => 'merchandise',
                'name' => 'BrewHaus Apron',
                'slug' => 'brewhaus-apron',
                'short_description' => 'Barista apron in dark canvas with utility front pockets.',
                'description' => 'A functional cafe-style apron with adjustable straps and enough structure for prep work, brewing service, or home coffee labs. The tone and texture stay on-brand with the Midnight Espresso system.',
                'price' => 990.00,
                'sale_price' => null,
                'sku' => 'BH-MR-003',
                'stock_quantity' => 8,
                'low_stock_threshold' => 3,
                'weight_grams' => 400,
                'size_options' => ['One size fits most'],
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Merchandise', 'Barista Gear', 'Giftable'],
            ],
            [
                'category' => 'gift-sets',
                'name' => 'The Roaster\'s Box',
                'slug' => 'roasters-box-gift-set',
                'short_description' => 'Curated bundle of beans, mug, and brew notes for gifting.',
                'description' => 'A premium gift set built around BrewHaus best-sellers. It pairs coffee, accessories, and printed tasting notes in a presentation box made for holidays, launches, and thoughtful client gifting.',
                'price' => 2490.00,
                'sale_price' => null,
                'sku' => 'BH-GS-001',
                'stock_quantity' => 6,
                'low_stock_threshold' => 5,
                'weight_grams' => 1450,
                'is_active' => true,
                'is_featured' => true,
                'tags' => ['Gift Set', 'Featured', 'Best Seller'],
            ],
            [
                'category' => 'gift-sets',
                'name' => 'Sunday Brew Starter Kit',
                'slug' => 'sunday-brew-starter-kit',
                'short_description' => 'Entry bundle with brewer, beans, and a simple guide card.',
                'description' => 'A starter-friendly bundle that gives new customers a practical path into manual brewing. It includes approachable coffee, entry equipment, and a compact guide so the first brew feels intentional, not intimidating.',
                'price' => 3290.00,
                'sale_price' => null,
                'sku' => 'BH-GS-002',
                'stock_quantity' => 5,
                'low_stock_threshold' => 3,
                'weight_grams' => 1900,
                'is_active' => true,
                'is_featured' => false,
                'tags' => ['Gift Set', 'Starter Kit', 'Manual Brew'],
            ],
        ];

        foreach ($products as $payload) {
            $category = $categories->get($payload['category']);

            if ($category === null) {
                continue;
            }

            $product = Product::query()->updateOrCreate(
                ['sku' => $payload['sku']],
                [
                    'category_id' => $category->id,
                    'name' => $payload['name'],
                    'slug' => $payload['slug'],
                    'short_description' => $payload['short_description'],
                    'description' => $payload['description'],
                    'price' => $payload['price'],
                    'sale_price' => $payload['sale_price'],
                    'stock_quantity' => $payload['stock_quantity'],
                    'low_stock_threshold' => $payload['low_stock_threshold'],
                    'weight_grams' => $payload['weight_grams'],
                    'size_options' => $payload['size_options'] ?? null,
                    'is_active' => $payload['is_active'],
                    'is_featured' => $payload['is_featured'],
                ]
            );

            $tagIds = collect($payload['tags'])
                ->map(function (string $tagName) {
                    $tag = ProductTag::query()->firstOrCreate(
                        ['slug' => Str::slug($tagName)],
                        ['name' => $tagName]
                    );

                    return $tag->id;
                })
                ->all();

            $product->tags()->sync($tagIds);
            $product->images()->delete();
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
        }
    }
}
