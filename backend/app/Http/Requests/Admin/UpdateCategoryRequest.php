<?php

namespace App\Http\Requests\Admin;

class UpdateCategoryRequest extends StoreCategoryRequest
{
    public function rules(): array
    {
        $categoryId = (int) $this->route('id');
        $rules = parent::rules();
        $rules['slug'][3] = 'unique:categories,slug,'.$categoryId;

        return $rules;
    }
}
