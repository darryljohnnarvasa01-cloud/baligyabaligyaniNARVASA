<?php

namespace App\Http\Requests\Admin;

class UpdateProductRequest extends StoreProductRequest
{
    public function rules(): array
    {
        $productId = (int) $this->route('id');
        $rules = parent::rules();
        $rules['slug'][3] = 'unique:products,slug,'.$productId;
        $rules['sku'][3] = 'unique:products,sku,'.$productId;

        return $rules;
    }
}
