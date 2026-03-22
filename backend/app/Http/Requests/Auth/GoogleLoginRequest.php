<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class GoogleLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $credential = $this->input('credential');
        $sessionId = $this->input('session_id');

        if (is_string($credential)) {
            $this->merge([
                'credential' => trim($credential),
            ]);
        }

        if (is_string($sessionId)) {
            $this->merge([
                'session_id' => trim($sessionId),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'credential' => ['required', 'string'],
            'session_id' => ['nullable', 'string', 'max:255'],
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
