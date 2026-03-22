<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StoreCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:64', 'unique:coupons,code'],
            'type' => ['required', 'string', Rule::in(['percent', 'fixed'])],
            'value' => ['required', 'numeric', 'min:0.01'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $type = strtolower((string) $this->input('type'));
            $value = (float) $this->input('value', 0);

            if ($type === 'percent' && $value > 100) {
                $validator->errors()->add('value', 'Percent coupons cannot exceed 100.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim((string) $this->input('code'))),
            'type' => strtolower(trim((string) $this->input('type'))),
            'value' => $this->normalizeDecimalInput($this->input('value')),
            'min_order_amount' => $this->normalizeDecimalInput($this->input('min_order_amount')),
            'usage_limit' => $this->normalizeIntegerInput($this->input('usage_limit')),
            'expires_at' => $this->normalizeNullableString($this->input('expires_at')),
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Validation failed.',
            'errors' => $validator->errors()->toArray(),
        ], 422));
    }

    protected function normalizeDecimalInput(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $value;
    }

    protected function normalizeIntegerInput(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    protected function normalizeNullableString(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
