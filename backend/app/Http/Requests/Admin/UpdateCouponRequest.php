<?php

namespace App\Http\Requests\Admin;

class UpdateCouponRequest extends StoreCouponRequest
{
    public function rules(): array
    {
        $couponId = (int) $this->route('id');
        $rules = parent::rules();
        $rules['code'][3] = 'unique:coupons,code,'.$couponId;

        return $rules;
    }
}
