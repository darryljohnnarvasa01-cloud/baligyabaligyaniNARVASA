<?php

namespace Database\Seeders;

use App\Models\Coupon;
use Illuminate\Database\Seeder;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $coupons = [
            [
                'code' => 'MIDNIGHT10',
                'type' => 'percent',
                'value' => 10.00,
                'min_order_amount' => 999.00,
                'usage_limit' => 300,
                'used_count' => 0,
                'expires_at' => now()->addMonths(3),
                'is_active' => true,
            ],
            [
                'code' => 'BREW150',
                'type' => 'fixed',
                'value' => 150.00,
                'min_order_amount' => 1499.00,
                'usage_limit' => 150,
                'used_count' => 0,
                'expires_at' => now()->addMonths(2),
                'is_active' => true,
            ],
            [
                'code' => 'DAVAOFREE',
                'type' => 'fixed',
                'value' => 120.00,
                'min_order_amount' => 799.00,
                'usage_limit' => null,
                'used_count' => 0,
                'expires_at' => null,
                'is_active' => true,
            ],
            [
                'code' => 'EMBER20',
                'type' => 'percent',
                'value' => 20.00,
                'min_order_amount' => 1999.00,
                'usage_limit' => 75,
                'used_count' => 0,
                'expires_at' => now()->addMonth(),
                'is_active' => false,
            ],
        ];

        foreach ($coupons as $coupon) {
            Coupon::query()->updateOrCreate(
                ['code' => $coupon['code']],
                $coupon
            );
        }
    }
}
