<?php

namespace App\Http\Requests\Rider;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ReportDeliveryIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'issue_type' => ['required', 'string', 'in:customer_unreachable,address_not_found,payment_issue,safety_concern,other'],
            'details' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'issue_type.required' => 'Choose the issue you need to report.',
            'issue_type.in' => 'Choose a valid delivery issue type.',
            'details.max' => 'The issue details must not be longer than 1000 characters.',
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
