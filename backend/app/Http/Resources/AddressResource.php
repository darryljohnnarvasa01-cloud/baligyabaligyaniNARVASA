<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Address
 */
class AddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'user_id' => (int) $this->user_id,
            'label' => (string) $this->label,
            'recipient_name' => (string) $this->recipient_name,
            'phone' => (string) $this->phone,
            'street' => (string) $this->street,
            'barangay' => (string) $this->barangay,
            'city' => (string) $this->city,
            'province' => (string) $this->province,
            'zip_code' => (string) $this->zip_code,
            'is_default' => (bool) $this->is_default,
            'full_address' => implode(', ', array_filter([
                $this->street,
                $this->barangay,
                $this->city,
                $this->province,
                $this->zip_code,
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
