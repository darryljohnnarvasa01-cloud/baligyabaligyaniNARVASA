<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Checkout\ApplyCouponRequest;
use App\Http\Requests\Checkout\CheckoutRequest;
use App\Http\Resources\CouponResource;
use App\Models\User;
use App\Services\CheckoutService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CheckoutController extends ApiController
{
    public function __construct(protected CheckoutService $checkoutService)
    {
    }

    // [CODEX] E-commerce controller method: applyCoupon
    // Model: Coupon, Cart  Request: ApplyCouponRequest  Resource: CouponResource
    // PayMongo: no
    // Business rules: validate the current customer's coupon against the live cart subtotal and return the recalculated discount summary.
    // Returns: ApiController::success() or ::error()
    public function applyCoupon(ApplyCouponRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        try {
            $summary = $this->checkoutService->previewCoupon($user, (string) $request->validated('coupon_code'));
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        }

        return $this->success([
            'coupon' => CouponResource::make($summary['coupon'])->resolve($request),
            'discount_amount' => $summary['discount_amount'],
            'subtotal' => $summary['subtotal'],
            'shipping_fee' => $summary['shipping_fee'],
            'total_amount' => $summary['total_amount'],
        ], 'Coupon applied.');
    }

    // [CODEX] E-commerce controller method: initiate
    // Model: Order, Payment, Cart  Request: CheckoutRequest  Resource: OrderResource
    // PayMongo: yes - create a GCash source or PayMaya checkout session for online orders, skip PayMongo for COD
    // Business rules: require an authenticated customer, validate the cart and stock, deduct stock in a transaction, create order snapshots, and return the checkout redirect when needed.
    // Returns: ApiController::success() or ::error()
    public function initiate(CheckoutRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        try {
            $order = $this->checkoutService->initiate($user, $request->validated());
        } catch (ModelNotFoundException) {
            return $this->error('Shipping address not found.', [], 404);
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        } catch (\RuntimeException $exception) {
            Log::error('Checkout runtime exception.', [
                'user_id' => $user->id,
                'payload' => $request->validated(),
                'message' => $exception->getMessage(),
            ]);

            return $this->error($exception->getMessage(), [], 500);
        } catch (\Throwable $exception) {
            Log::error('Checkout unhandled exception.', [
                'user_id' => $user->id,
                'payload' => $request->validated(),
                'message' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString(),
            ]);

            return $this->error('Checkout failed unexpectedly.', [], 500);
        }

        return $this->success([
            'order_number' => $order->order_number,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'order_status' => $order->order_status,
            'coupon_code' => $order->coupon_code,
            'discount_amount' => (float) $order->discount_amount,
            'checkout_url' => $order->paymongo_checkout_url,
        ], 'Checkout initiated.', 201);
    }
}
