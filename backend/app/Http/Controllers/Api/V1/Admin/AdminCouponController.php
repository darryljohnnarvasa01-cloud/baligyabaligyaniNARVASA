<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Admin\StoreCouponRequest;
use App\Http\Requests\Admin\UpdateCouponRequest;
use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use App\Services\Admin\AdminCouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCouponController extends ApiController
{
    public function __construct(private readonly AdminCouponService $service)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Coupon  Request: Request  Resource: CouponResource
    // PayMongo: no
    // Business rules: return all coupon records for admin management with usage, expiry, and active-state context.
    // Returns: ApiController::success() or ::error()
    public function index(Request $request): JsonResponse
    {
        $coupons = Coupon::query()->latest('id')->get();

        return $this->success(
            CouponResource::collection($coupons)->resolve($request),
            'Coupons retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: store
    // Model: Coupon  Request: StoreCouponRequest  Resource: CouponResource
    // PayMongo: no
    // Business rules: create a coupon with normalized code, amount rules, usage limits, and expiration metadata for checkout discounts.
    // Returns: ApiController::success() or ::error()
    public function store(StoreCouponRequest $request): JsonResponse
    {
        $coupon = $this->service->create($request->validated());

        return $this->success(
            CouponResource::make($coupon)->resolve($request),
            'Coupon created successfully.',
            201
        );
    }

    // [CODEX] E-commerce controller method: update
    // Model: Coupon  Request: UpdateCouponRequest  Resource: CouponResource
    // PayMongo: no
    // Business rules: update coupon code, discount type, availability, and usage constraints without losing historical usage counts.
    // Returns: ApiController::success() or ::error()
    public function update(UpdateCouponRequest $request, int $id): JsonResponse
    {
        $coupon = $this->service->update(Coupon::query()->findOrFail($id), $request->validated());

        return $this->success(
            CouponResource::make($coupon)->resolve($request),
            'Coupon updated successfully.'
        );
    }

    // [CODEX] E-commerce controller method: destroy
    // Model: Coupon  Request: none  Resource: none
    // PayMongo: no
    // Business rules: remove an unused or obsolete coupon from the admin promotion catalog.
    // Returns: ApiController::success() or ::error()
    public function destroy(int $id): JsonResponse
    {
        $this->service->delete(Coupon::query()->findOrFail($id));

        return $this->success(null, 'Coupon deleted successfully.');
    }
}
