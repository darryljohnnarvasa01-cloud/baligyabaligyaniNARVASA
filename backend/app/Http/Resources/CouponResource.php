<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Coupon
 */
class CouponResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'code' => (string) $this->code,
            'type' => (string) $this->type,
            'value' => (float) $this->value,
            'min_order_amount' => $this->min_order_amount !== null ? (float) $this->min_order_amount : null,
            'usage_limit' => $this->usage_limit !== null ? (int) $this->usage_limit : null,
            'used_count' => (int) $this->used_count,
            'remaining_uses' => $this->remainingUses(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'is_active' => (bool) $this->is_active,
            'is_expired' => $this->isExpired(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
