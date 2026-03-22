<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Whole Beans',
                'description' => 'Premium whole bean coffees roasted for espresso, filter, and late-night ritual brewing.',
                'image' => 'categories/whole-beans.jpg',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Ground Coffee',
                'description' => 'Freshly ground coffee for moka pots, drip brewers, French press, and easy home brewing.',
                'image' => 'categories/ground-coffee.jpg',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Brewing Equipment',
                'description' => 'Manual brew tools and precision gear for a polished coffee bar setup.',
                'image' => 'categories/brewing-equipment.jpg',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Merchandise',
                'description' => 'Coffee lifestyle pieces built around the BrewHaus Midnight Espresso identity.',
                'image' => 'categories/merchandise.jpg',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Gift Sets',
                'description' => 'Curated bundles for gifting, hosting, or upgrading your personal brew ritual.',
                'image' => 'categories/gift-sets.jpg',
                'is_active' => true,
                'sort_order' => 5,
            ],
        ];

        foreach ($categories as $payload) {
            Category::query()->updateOrCreate(
                ['slug' => Str::slug($payload['name'])],
                $payload
            );
        }
    }
}