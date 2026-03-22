<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Customer\IndexCustomerOrdersRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use App\Services\CheckoutService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CustomerOrderController extends ApiController
{
    public function __construct(private readonly CheckoutService $checkoutService)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Order  Request: IndexCustomerOrdersRequest  Resource: OrderResource
    // PayMongo: no
    // Business rules: list only the authenticated customer's orders, support order_status filtering, and return the paginated API contract.
    // Returns: ApiController::success() or ::error()
    public function index(IndexCustomerOrdersRequest $request): JsonResponse
    {
        /** @var User|null $customer */
        $customer = $request->user();

        if (! $customer) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $perPage = (int) ($request->validated('per_page') ?? 10);
        $status = $request->validated('status');
        $view = $request->validated('view');

        $paginator = Order::query()
            ->where('user_id', $customer->id)
            ->with($this->orderRelations())
            ->when(
                (! is_string($status) || $status === '') && $view === 'active',
                fn (Builder $query) => $query->where('order_status', '!=', 'delivered')
            )
            ->when(
                (! is_string($status) || $status === '') && $view === 'history',
                fn (Builder $query) => $query->where('order_status', 'delivered')
            )
            ->when(is_string($status) && $status !== '', fn (Builder $query) => $query->where('order_status', $status))
            ->latest('id')
            ->paginate($perPage);

        return $this->paginated(
            $paginator,
            OrderResource::collection($paginator->getCollection())->resolve($request)
        );
    }

    // [CODEX] E-commerce controller method: show
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: return a single order by order_number for the authenticated customer, including tracking, items, payment, and rider details.
    // Returns: ApiController::success() or ::error()
    public function show(Request $request, string $number): JsonResponse
    {
        /** @var User|null $customer */
        $customer = $request->user();

        if (! $customer) {
            return $this->error('Unauthenticated.', [], 401);
        }

        try {
            $order = $this->checkoutService->findOrderForCustomer($customer, $number);
        } catch (ModelNotFoundException) {
            return $this->error('Order not found.', [], 404);
        }

        return $this->success(
            OrderResource::make($order)->resolve($request),
            'Order retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: cancel
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: allow cancellation only while order_status and payment_status are both pending, then restore stock and append an order status log.
    // Returns: ApiController::success() or ::error()
    public function cancel(Request $request, string $number): JsonResponse
    {
        /** @var User|null $customer */
        $customer = $request->user();

        if (! $customer) {
            return $this->error('Unauthenticated.', [], 401);
        }

        try {
            $order = Order::query()
                ->where('user_id', $customer->id)
                ->where('order_number', $number)
                ->firstOrFail();

            $updated = $this->checkoutService->cancelPendingOrderForCustomer($order, $customer);
        } catch (ModelNotFoundException) {
            return $this->error('Order not found.', [], 404);
        } catch (ValidationException $exception) {
            return $this->error('Only pending unpaid orders can be cancelled.', $exception->errors(), 422);
        }

        return $this->success(
            OrderResource::make($updated)->resolve($request),
            'Order cancelled successfully.'
        );
    }

    /**
     * @return array<int, string|\Closure>
     */
    protected function orderRelations(): array
    {
        return [
            'customer.roles',
            'rider.roles',
            'shippingAddress',
            'coupon',
            'items.product.primaryImage',
            'statusLogs' => fn ($query) => $query->oldest('id')->with('changedBy.roles'),
            'payment',
        ];
    }
}
