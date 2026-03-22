<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\OrderResource;
use App\Models\User;
use App\Services\CheckoutService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends ApiController
{
    public function __construct(protected CheckoutService $checkoutService)
    {
    }

    // [CODEX] E-commerce controller method: showOrder
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: return the authenticated customer's order by order_number after checkout or payment redirect.
    // Returns: ApiController::success() or ::error()
    public function showOrder(Request $request, string $number): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        try {
            $order = $this->checkoutService->findOrderForCustomer($user, $number);
        } catch (ModelNotFoundException) {
            return $this->error('Order not found.', [], 404);
        }

        return $this->success(
            OrderResource::make($order)->resolve($request),
            'Order retrieved.'
        );
    }
}
