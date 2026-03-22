<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ResolvesPublicAssetUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    use ResolvesPublicAssetUrls;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $avatar = $this->avatar;
        $avatarUrl = $this->resolvePublicAssetUrl($avatar) ?: $this->provider_avatar;

        return [
            'id' => (int) $this->id,
            'name' => (string) $this->name,
            'email' => (string) $this->email,
            'phone' => $this->phone,
            'avatar' => $avatar,
            'avatar_url' => $avatarUrl,
            'auth_provider' => $this->auth_provider,
            'is_active' => (bool) $this->is_active,
            'has_verified_email' => (bool) $this->hasVerifiedEmail(),
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
