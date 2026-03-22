<?php

namespace App\Http\Requests\Checkout;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipping_address_id' => ['required', 'integer', 'exists:addresses,id'],
            'payment_method' => ['required', 'string', 'in:gcash,paymaya,cod'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'coupon_code' => ['nullable', 'string', 'max:64'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'shipping_address_id' => (int) $this->input('shipping_address_id'),
            'payment_method' => is_string($this->input('payment_method')) ? strtolower(trim((string) $this->input('payment_method'))) : $this->input('payment_method'),
            'notes' => is_string($this->input('notes')) ? trim((string) $this->input('notes')) : $this->input('notes'),
            'coupon_code' => is_string($this->input('coupon_code')) ? strtoupper(trim((string) $this->input('coupon_code'))) : $this->input('coupon_code'),
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
}
