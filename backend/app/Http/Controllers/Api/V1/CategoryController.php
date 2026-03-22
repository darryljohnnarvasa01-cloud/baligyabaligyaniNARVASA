<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\CategoryResource;
use App\Services\ProductCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends ApiController
{
    public function __construct(protected ProductCatalogService $productCatalogService)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Category  Request: Request  Resource: CategoryResource
    // PayMongo: no
    // Business rules: return active catalog categories ordered by sort_order and include the count of active products in each category.
    // Returns: ApiController::success() or ::error()
    public function index(Request $request): JsonResponse
    {
        $categories = $this->productCatalogService->getActiveCategories();

        return $this->success(
            CategoryResource::collection($categories)->resolve($request),
            'Categories retrieved.'
        );
    }
}
