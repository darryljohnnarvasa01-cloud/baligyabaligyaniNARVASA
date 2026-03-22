<?php

namespace App\Http\Requests\Rider;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UploadDeliveryProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proof_image' => ['required', 'image', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'proof_image.required' => 'A proof-of-delivery photo is required.',
            'proof_image.image' => 'The proof-of-delivery file must be an image.',
            'proof_image.max' => 'The proof-of-delivery photo must not be larger than 5 MB.',
        ];
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
