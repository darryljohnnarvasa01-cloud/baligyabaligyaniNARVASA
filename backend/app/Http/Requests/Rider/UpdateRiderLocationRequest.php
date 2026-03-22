<?php

namespace App\Http\Requests\Rider;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateRiderLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    public function messages(): array
    {
        return [
            'lat.required' => 'The rider latitude is required.',
            'lat.numeric' => 'The rider latitude must be a valid number.',
            'lat.between' => 'The rider latitude must be between -90 and 90.',
            'lng.required' => 'The rider longitude is required.',
            'lng.numeric' => 'The rider longitude must be a valid number.',
            'lng.between' => 'The rider longitude must be between -180 and 180.',
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
