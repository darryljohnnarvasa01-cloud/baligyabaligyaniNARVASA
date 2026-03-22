<?php

namespace App\Services\Admin;

use App\Models\Coupon;

class AdminCouponService
{
    public function create(array $payload): Coupon
    {
        return Coupon::query()->create($this->extractAttributes($payload));
    }

    public function update(Coupon $coupon, array $payload): Coupon
    {
        $coupon->fill($this->extractAttributes($payload))->save();

        return $coupon->fresh();
    }

    public function delete(Coupon $coupon): void
    {
        $coupon->delete();
    }

    protected function extractAttributes(array $payload): array
    {
        return [
            'code' => strtoupper(trim((string) $payload['code'])),
            'type' => strtolower(trim((string) $payload['type'])),
            'value' => number_format((float) $payload['value'], 2, '.', ''),
            'min_order_amount' => array_key_exists('min_order_amount', $payload) && $payload['min_order_amount'] !== null && $payload['min_order_amount'] !== ''
                ? number_format((float) $payload['min_order_amount'], 2, '.', '')
                : null,
            'usage_limit' => array_key_exists('usage_limit', $payload) && $payload['usage_limit'] !== null && $payload['usage_limit'] !== ''
                ? (int) $payload['usage_limit']
                : null,
            'expires_at' => $payload['expires_at'] ?? null,
            'is_active' => (bool) ($payload['is_active'] ?? true),
        ];
    }
}
