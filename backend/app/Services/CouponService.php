<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Order;
use Illuminate\Validation\ValidationException;

class CouponService
{
    /**
     * @return array{coupon: Coupon, discount_amount: string}
     */
    public function resolveDiscount(string $code, float $subtotal, bool $lock = false): array
    {
        $normalizedCode = strtoupper(trim($code));

        if ($normalizedCode === '') {
            throw ValidationException::withMessages([
                'coupon_code' => ['Enter a coupon code before applying it.'],
            ]);
        }

        $query = Coupon::query()->where('code', $normalizedCode);

        if ($lock) {
            $query->lockForUpdate();
        }

        /** @var Coupon|null $coupon */
        $coupon = $query->first();

        if (! $coupon) {
            throw ValidationException::withMessages([
                'coupon_code' => ['The selected coupon code is invalid.'],
            ]);
        }

        $this->ensureCouponIsApplicable($coupon, $subtotal);

        return [
            'coupon' => $coupon,
            'discount_amount' => $this->calculateDiscountAmount($coupon, $subtotal),
        ];
    }

    public function releaseUsage(Order $order, bool $lock = true): void
    {
        if (! $order->coupon_id) {
            return;
        }

        $query = Coupon::query()->whereKey($order->coupon_id);

        if ($lock) {
            $query->lockForUpdate();
        }

        /** @var Coupon|null $coupon */
        $coupon = $query->first();

        if (! $coupon || (int) $coupon->used_count <= 0) {
            return;
        }

        $coupon->decrement('used_count');
    }

    public function calculateDiscountAmount(Coupon $coupon, float $subtotal): string
    {
        $discount = $coupon->type === 'percent'
            ? round($subtotal * ((float) $coupon->value / 100), 2)
            : round((float) $coupon->value, 2);

        $discount = min($discount, max(0, round($subtotal, 2)));

        return number_format($discount, 2, '.', '');
    }

    protected function ensureCouponIsApplicable(Coupon $coupon, float $subtotal): void
    {
        if (! $coupon->is_active) {
            throw ValidationException::withMessages([
                'coupon_code' => ['This coupon is currently inactive.'],
            ]);
        }

        if ($coupon->isExpired()) {
            throw ValidationException::withMessages([
                'coupon_code' => ['This coupon has already expired.'],
            ]);
        }

        if (! $coupon->hasRemainingUses()) {
            throw ValidationException::withMessages([
                'coupon_code' => ['This coupon has reached its usage limit.'],
            ]);
        }

        if ($coupon->min_order_amount !== null && $subtotal < (float) $coupon->min_order_amount) {
            throw ValidationException::withMessages([
                'coupon_code' => ['This coupon requires a higher cart subtotal.'],
            ]);
        }
    }
}
