<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Admin\AssignRiderRequest;
use App\Http\Requests\Admin\IndexOrdersRequest;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Repositories\OrderRepository;
use App\Services\CheckoutService;
use App\Services\Admin\AdminOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminOrderController extends ApiController
{
    public function __construct(
        private readonly OrderRepository $orders,
        private readonly AdminOrderService $service,
        private readonly CheckoutService $checkoutService,
    ) {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Order  Request: IndexOrdersRequest  Resource: OrderResource
    // PayMongo: no
    // Business rules: list ecommerce orders with filters for order status, payment status, payment method, and date range.
    // Returns: ApiController::success() or ::error()
    public function index(IndexOrdersRequest $request): JsonResponse
    {
        $paginator = $this->orders->paginateForAdmin($request->validated());

        return $this->paginated(
            $paginator,
            OrderResource::collection($paginator->getCollection())->resolve($request)
        );
    }

    // [CODEX] E-commerce controller method: show
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: return a single ecommerce order with customer, rider, payment, items, and tracking context for admins.
    // Returns: ApiController::success() or ::error()
    public function show(Request $request, int $id): JsonResponse
    {
        $order = $this->checkoutService->refreshOrderPaymentStatus(
            $this->orders->findOrFail($id)
        );

        return $this->success(
            OrderResource::make($order)->resolve($request),
            'Order retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: updateStatus
    // Model: Order  Request: UpdateOrderStatusRequest  Resource: OrderResource
    // PayMongo: no
    // Business rules: update order_status, keep timestamps in sync, restore stock on cancel/refund, and append an audit log.
    // Returns: ApiController::success() or ::error()
    public function updateStatus(UpdateOrderStatusRequest $request, int $id): JsonResponse
    {
        try {
            $order = $this->service->updateStatus(
                $this->checkoutService->refreshOrderPaymentStatus($this->orders->findOrFail($id)),
                $request->validated('order_status'),
                $request->validated('note'),
                $request->user()?->id
            );
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        }

        return $this->success(
            OrderResource::make($order)->resolve($request),
            'Order status updated.'
        );
    }

    // [CODEX] E-commerce controller method: assignRider
    // Model: Order  Request: AssignRiderRequest  Resource: OrderResource
    // PayMongo: no
    // Business rules: assign an active rider to a valid order and keep the order in a rider-visible state.
    // Returns: ApiController::success() or ::error()
    public function assignRider(AssignRiderRequest $request, int $id): JsonResponse
    {
        try {
            $order = $this->service->assignRider(
                $this->checkoutService->refreshOrderPaymentStatus($this->orders->findOrFail($id)),
                (int) $request->validated('rider_id'),
                $request->validated('note'),
                $request->user()?->id
            );
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        }

        return $this->success(
            OrderResource::make($order)->resolve($request),
            'Rider assigned successfully.'
        );
    }
}
