<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Admin\IndexAdminProductsRequest;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\Admin\AdminProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProductController extends ApiController
{
    public function __construct(private readonly AdminProductService $service)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Product  Request: IndexAdminProductsRequest  Resource: ProductResource
    // PayMongo: no
    // Business rules: Return paginated admin product results with category, image, tag, search, category, and active-status filters.
    // Returns: ApiController::success() or ::error()
    public function index(IndexAdminProductsRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $perPage = max(1, min((int) ($filters['per_page'] ?? 12), 100));

        $paginator = Product::query()
            ->with(['category', 'images', 'primaryImage', 'tags'])
            ->when(! empty($filters['search']), function ($query) use ($filters): void {
                $search = trim((string) $filters['search']);
                $query->where(function ($nested) use ($search): void {
                    $nested
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('sku', 'like', '%'.$search.'%')
                        ->orWhere('slug', 'like', '%'.$search.'%');
                });
            })
            ->when(! empty($filters['category_id']), fn ($query) => $query->where('category_id', (int) $filters['category_id']))
            ->when(($filters['status'] ?? null) === 'active', fn ($query) => $query->where('is_active', true))
            ->when(($filters['status'] ?? null) === 'inactive', fn ($query) => $query->where('is_active', false))
            ->latest('id')
            ->paginate($perPage);

        return $this->paginated(
            $paginator,
            ProductResource::collection($paginator->getCollection())->resolve($request)
        );
    }

    // [CODEX] E-commerce controller method: show
    // Model: Product  Request: Request  Resource: ProductResource
    // PayMongo: no
    // Business rules: Load a single admin product with category, images, primary image, and tags for editing.
    // Returns: ApiController::success() or ::error()
    public function show(Request $request, int $id): JsonResponse
    {
        $product = Product::query()
            ->with(['category', 'images', 'primaryImage', 'tags'])
            ->findOrFail($id);

        return $this->success(ProductResource::make($product)->resolve($request), 'Product retrieved.');
    }

    // [CODEX] E-commerce controller method: store
    // Model: Product  Request: StoreProductRequest  Resource: ProductResource
    // PayMongo: no
    // Business rules: Create a product record, persist tags and images, and return the normalized product payload for admin use.
    // Returns: ApiController::success() or ::error()
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->service->create($request->validated());

        return $this->success(ProductResource::make($product)->resolve($request), 'Product created successfully.', 201);
    }

    // [CODEX] E-commerce controller method: update
    // Model: Product  Request: UpdateProductRequest  Resource: ProductResource
    // PayMongo: no
    // Business rules: Update product data, images, and tags while preserving the admin-facing resource shape.
    // Returns: ApiController::success() or ::error()
    public function update(UpdateProductRequest $request, int $id): JsonResponse
    {
        $product = $this->service->update(Product::query()->findOrFail($id), $request->validated());

        return $this->success(ProductResource::make($product)->resolve($request), 'Product updated successfully.');
    }

    // [CODEX] E-commerce controller method: destroy
    // Model: Product  Request: none  Resource: none
    // PayMongo: no
    // Business rules: Remove the selected product through the admin product service and return a standard success envelope.
    // Returns: ApiController::success() or ::error()
    public function destroy(int $id): JsonResponse
    {
        $this->service->delete(Product::query()->findOrFail($id));

        return $this->success(null, 'Product deleted successfully.');
    }
}
