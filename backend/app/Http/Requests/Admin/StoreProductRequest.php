<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug'],
            'short_description' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0', 'lt:price'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'weight_grams' => ['nullable', 'integer', 'min:0'],
            'size_options' => ['nullable', 'array', 'max:12'],
            'size_options.*' => ['string', 'max:50'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'is_featured' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'primary_image_index' => ['nullable', 'integer', 'min:0'],
            'images' => ['nullable', 'array'],
            'images.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:12288'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'images.*.mimes' => 'Product images must be JPG, PNG, or WEBP.',
            'images.*.max' => 'Each product image must be 12 MB or smaller.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $tags = $this->input('tags', []);

        if (is_string($tags)) {
            $decoded = json_decode($tags, true);
            $tags = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $tags)));
        }

        $sizeOptions = $this->input('size_options', []);

        if (is_string($sizeOptions)) {
            $decoded = json_decode($sizeOptions, true);
            $sizeOptions = is_array($decoded)
                ? $decoded
                : preg_split('/[\r\n,]+/', $sizeOptions);
        }

        $slug = $this->input('slug');
        $name = $this->input('name');

        $this->merge([
            'slug' => is_string($slug) && trim($slug) !== '' ? trim($slug) : (is_string($name) ? Str::slug($name) : null),
            'is_featured' => filter_var($this->input('is_featured', false), FILTER_VALIDATE_BOOLEAN),
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
            'tags' => is_array($tags) ? array_values($tags) : [],
            'size_options' => collect(is_array($sizeOptions) ? $sizeOptions : [])
                ->map(fn ($option) => trim((string) $option))
                ->filter()
                ->unique()
                ->values()
                ->all(),
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
