<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Store\ProductIndexRequest;
use App\Http\Resources\ProductResource;
use App\Services\ProductCatalogService;
use Illuminate\Http\JsonResponse;

class ProductController extends ApiController
{
    public function __construct(protected ProductCatalogService $productCatalogService)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Product  Request: ProductIndexRequest  Resource: ProductResource
    // PayMongo: no
    // Business rules: return public active products, apply category/search/sort/featured/on_sale filters, and respond with the paginated API contract.
    // Returns: ApiController::success() or ::error()
    public function index(ProductIndexRequest $request): JsonResponse
    {
        $products = $this->productCatalogService->getPaginatedProducts($request->filters());

        return $this->paginated(
            $products,
            ProductResource::collection($products->getCollection())->resolve($request)
        );
    }

    // [CODEX] E-commerce controller method: show
    // Model: Product  Request: none  Resource: ProductResource
    // PayMongo: no
    // Business rules: return the active product by slug together with four related products from the same active category.
    // Returns: ApiController::success() or ::error()
    public function show(string $slug): JsonResponse
    {
        $product = $this->productCatalogService->findProductBySlug($slug);

        if (! $product) {
            return $this->error('Product not found.', [], 404);
        }

        $relatedProducts = $this->productCatalogService->getRelatedProducts($product, 4);

        return $this->success([
            'product' => ProductResource::make($product)->resolve(request()),
            'related_products' => ProductResource::collection($relatedProducts)->resolve(request()),
        ], 'Product retrieved.');
    }
}
