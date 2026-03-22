<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesSeeder::class,
            UserSeeder::class,
            CategorySeeder::class,
            ProductSeeder::class,
            AddressSeeder::class,
            OrderSeeder::class,
            CouponSeeder::class,
        ]);
    }
}
