<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Admin\AdjustStockRequest;
use App\Http\Requests\Admin\RestockInventoryRequest;
use App\Http\Resources\AdminInventoryResource;
use App\Models\Product;
use App\Services\Admin\AdminInventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminInventoryController extends ApiController
{
    public function __construct(private readonly AdminInventoryService $service)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Product, InventoryLog  Request: Request  Resource: AdminInventoryResource
    // PayMongo: no
    // Business rules: show stock from products.stock_quantity ordered by lowest stock first with audit logs attached.
    // Returns: ApiController::success() or ::error()
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->with([
                'primaryImage',
                'inventoryLogs' => fn ($query) => $query->latest('id')->with('createdBy'),
            ])
            ->orderBy('stock_quantity')
            ->orderBy('name')
            ->get();

        return $this->success(
            AdminInventoryResource::collection($products)->resolve($request),
            'Inventory retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: restock
    // Model: Product, InventoryLog  Request: RestockInventoryRequest  Resource: AdminInventoryResource
    // PayMongo: no
    // Business rules: increment product stock, write a restock inventory log, and return the refreshed product inventory row.
    // Returns: ApiController::success() or ::error()
    public function restock(RestockInventoryRequest $request, int $id): JsonResponse
    {
        $product = Product::query()->findOrFail($id);
        $actor = $request->user();

        if (! $actor) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $updated = $this->service->restock(
            $product,
            (int) $request->validated('quantity_to_add'),
            $request->validated('note'),
            $actor
        );

        return $this->success(
            AdminInventoryResource::make($updated)->resolve($request),
            'Inventory restocked successfully.'
        );
    }

    // [CODEX] E-commerce controller method: adjust
    // Model: Product, InventoryLog  Request: AdjustStockRequest  Resource: AdminInventoryResource
    // PayMongo: no
    // Business rules: set an exact stock quantity through the inventory service, capture adjustment type, and return the refreshed product with the latest audit log.
    // Returns: ApiController::success() or ::error()
    public function adjust(AdjustStockRequest $request, Product $product): JsonResponse
    {
        $actorId = (int) ($request->user()?->id ?? 0);

        if ($actorId <= 0) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $validated = $request->validated();

        $updated = $this->service->adjustStock(
            $product,
            (int) $validated['new_quantity'],
            (string) $validated['adjustment_type'],
            (string) ($validated['note'] ?? ''),
            $actorId
        );

        return $this->success(
            AdminInventoryResource::make($updated)->resolve($request),
            'Inventory adjusted successfully.'
        );
    }
}
