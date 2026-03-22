<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => (string) $this->name,
            'email' => (string) $this->email,
            'phone' => $this->phone,
            'avatar_url' => UserResource::make($this)->resolve($request)['avatar_url'] ?? null,
            'is_active' => (bool) $this->is_active,
            'role' => $this->getRoleNames()->first(),
            'orders_count' => (int) ($this->orders_count ?? 0),
            'assigned_orders_count' => (int) ($this->assigned_orders_count ?? 0),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
