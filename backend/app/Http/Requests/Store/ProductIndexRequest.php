<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'category' => ['nullable', 'string', 'max:120'],
            'search' => ['nullable', 'string', 'max:120'],
            'sort' => ['nullable', Rule::in(['price_asc', 'price_desc', 'newest', 'popular'])],
            'featured' => ['nullable', 'boolean'],
            'on_sale' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $prepared = [];

        if ($this->has('search')) {
            $prepared['search'] = trim((string) $this->query('search'));
        }

        if ($this->has('featured')) {
            $prepared['featured'] = filter_var(
                $this->query('featured'),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );
        }

        if ($this->has('on_sale')) {
            $prepared['on_sale'] = filter_var(
                $this->query('on_sale'),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );
        }

        if ($this->has('per_page')) {
            $prepared['per_page'] = (int) $this->query('per_page');
        }

        if ($this->has('page')) {
            $prepared['page'] = (int) $this->query('page');
        }

        if ($prepared !== []) {
            $this->merge($prepared);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        $validated = $this->validated();

        return [
            'category' => $validated['category'] ?? null,
            'search' => $validated['search'] ?? null,
            'sort' => $validated['sort'] ?? 'newest',
            'featured' => (bool) ($validated['featured'] ?? false),
            'on_sale' => (bool) ($validated['on_sale'] ?? false),
            'per_page' => (int) ($validated['per_page'] ?? 12),
        ];
    }
}
