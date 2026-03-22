<?php

namespace App\Http\Controllers\Api\V1\Rider;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Rider\DeliverOrderRequest;
use App\Http\Requests\Rider\ReportDeliveryIssueRequest;
use App\Http\Requests\Rider\UpdateRiderLocationRequest;
use App\Http\Requests\Rider\UploadDeliveryProofRequest;
use App\Http\Resources\OrderResource;
use App\Repositories\OrderRepository;
use App\Services\Rider\RiderOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RiderOrderController extends ApiController
{
    public function __construct(
        private readonly OrderRepository $orders,
        private readonly RiderOrderService $service,
    ) {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: Return the authenticated rider's assigned delivery orders limited to the active rider workflow states.
    // Returns: ApiController::success() or ::error()
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $orders = $this->orders->listForRider((int) $rider->id);

        return $this->success(
            OrderResource::collection($orders)->resolve($request),
            'Orders retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: history
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: Return the authenticated rider's recently completed deliveries for review and proof lookup.
    // Returns: ApiController::success() or ::error()
    public function history(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        return $this->success(
            OrderResource::collection($this->orders->listHistoryForRider((int) $rider->id))->resolve($request),
            'Delivery history retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: queue
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: Show packed and shipped orders that are not yet claimed by any rider.
    // Returns: ApiController::success() or ::error()
    public function queue(Request $request): JsonResponse
    {
        if (! $request->user()) {
            return $this->error('Unauthenticated.', [], 401);
        }

        return $this->success(
            OrderResource::collection($this->orders->listAvailableForRider())->resolve($request),
            'Available deliveries retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: summary
    // Model: Order  Request: Request  Resource: none
    // PayMongo: no
    // Business rules: Return rider-facing summary metrics for active runs, queue visibility, COD collection, and estimated payout.
    // Returns: ApiController::success() or ::error()
    public function summary(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        return $this->success(
            $this->service->buildSummary((int) $rider->id),
            'Rider summary retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: show
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: Return one assigned rider order with shipping, payment, item, and status context for delivery execution.
    // Returns: ApiController::success() or ::error()
    public function show(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $order = $this->orders->findForRiderOrFail($id, (int) $rider->id);

        return $this->success(
            OrderResource::make($order)->resolve($request),
            'Order retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: pickup
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: Only packed or shipped orders can move to out_for_delivery, and the rider assignment must already match the authenticated rider.
    // Returns: ApiController::success() or ::error()
    public function pickup(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $order = $this->orders->findForRiderBasicOrFail($id, (int) $rider->id);

        try {
            $updated = $this->service->pickup($order, (int) $rider->id);
        } catch (ValidationException $exception) {
            return $this->error('Only packed or shipped orders can be picked up.', $exception->errors(), 422);
        }

        return $this->success(
            OrderResource::make($updated)->resolve($request),
            'Order picked up.'
        );
    }

    // [CODEX] E-commerce controller method: accept
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: Let a rider claim a packed or shipped delivery that is still unassigned.
    // Returns: ApiController::success() or ::error()
    public function accept(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $order = $this->orders->findAvailableForRiderBasicOrFail($id);

        try {
            $updated = $this->service->accept(
                $order,
                (int) $rider->id,
                is_string($request->input('note')) ? trim((string) $request->input('note')) : null,
            );
        } catch (ValidationException $exception) {
            return $this->error('Unable to accept delivery.', $exception->errors(), 422);
        }

        return $this->success(
            OrderResource::make($updated)->resolve($request),
            'Delivery accepted.'
        );
    }

    // [CODEX] E-commerce controller method: deliver
    // Model: Order  Request: Request  Resource: OrderResource
    // PayMongo: no
    // Business rules: Only out_for_delivery orders can be marked delivered, and the service stamps delivered_at and status logs.
    // Returns: ApiController::success() or ::error()
    public function deliver(DeliverOrderRequest $request, int $id): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $order = $this->orders->findForRiderBasicOrFail($id, (int) $rider->id);

        try {
            $updated = $this->service->deliver(
                $order,
                (int) $rider->id,
                $request->validated('delivery_note'),
                $request->file('proof_image'),
            );
        } catch (ValidationException $exception) {
            return $this->error('Unable to deliver order.', $exception->errors(), 422);
        }

        return $this->success(
            OrderResource::make($updated)->resolve($request),
            'Order delivered.'
        );
    }

    public function uploadProof(UploadDeliveryProofRequest $request, int $id): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $order = $this->orders->findForRiderBasicOrFail($id, (int) $rider->id);

        try {
            $updated = $this->service->uploadProof(
                $order,
                (int) $rider->id,
                $request->file('proof_image'),
            );
        } catch (ValidationException $exception) {
            return $this->error('Unable to upload delivery proof.', $exception->errors(), 422);
        }

        return $this->success(
            OrderResource::make($updated)->resolve($request),
            'Delivery proof uploaded.'
        );
    }

    public function reportIssue(ReportDeliveryIssueRequest $request, int $id): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $order = $this->orders->findForRiderBasicOrFail($id, (int) $rider->id);

        $updated = $this->service->reportIssue(
            $order,
            (int) $rider->id,
            (string) $request->validated('issue_type'),
            $request->validated('details'),
        );

        return $this->success(
            OrderResource::make($updated)->resolve($request),
            'Issue reported.'
        );
    }

    public function updateLocation(UpdateRiderLocationRequest $request): JsonResponse
    {
        /** @var \App\Models\User|null $rider */
        $rider = $request->user();

        if (! $rider) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $rider->forceFill([
            'current_lat' => (float) $request->validated('lat'),
            'current_lng' => (float) $request->validated('lng'),
            'location_updated_at' => now(),
        ])->save();

        return $this->success([
            'current_lat' => (float) $rider->current_lat,
            'current_lng' => (float) $rider->current_lng,
            'location_updated_at' => $rider->location_updated_at?->toIso8601String(),
        ], 'Location updated.');
    }
}
