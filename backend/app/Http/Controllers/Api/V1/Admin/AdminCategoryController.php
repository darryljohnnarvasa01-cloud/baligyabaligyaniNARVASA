<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\Admin\AdminCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCategoryController extends ApiController
{
    public function __construct(private readonly AdminCategoryService $service)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Category  Request: Request  Resource: CategoryResource
    // PayMongo: no
    // Business rules: Return all categories for admin management with product counts, ordered for storefront display control.
    // Returns: ApiController::success() or ::error()
    public function index(Request $request): JsonResponse
    {
        $categories = Category::query()
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $this->success(CategoryResource::collection($categories)->resolve($request), 'Categories retrieved.');
    }

    // [CODEX] E-commerce controller method: store
    // Model: Category  Request: StoreCategoryRequest  Resource: CategoryResource
    // PayMongo: no
    // Business rules: Create an admin-managed category with ordering, activation, description, and image metadata.
    // Returns: ApiController::success() or ::error()
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->service->create($request->validated());

        return $this->success(CategoryResource::make($category)->resolve($request), 'Category created successfully.', 201);
    }

    // [CODEX] E-commerce controller method: update
    // Model: Category  Request: UpdateCategoryRequest  Resource: CategoryResource
    // PayMongo: no
    // Business rules: Update category content and storefront ordering while returning the normalized category payload.
    // Returns: ApiController::success() or ::error()
    public function update(UpdateCategoryRequest $request, int $id): JsonResponse
    {
        $category = $this->service->update(Category::query()->findOrFail($id), $request->validated());

        return $this->success(CategoryResource::make($category)->resolve($request), 'Category updated successfully.');
    }

    // [CODEX] E-commerce controller method: destroy
    // Model: Category  Request: none  Resource: none
    // PayMongo: no
    // Business rules: Delete the selected category through the admin category service and return a standard success envelope.
    // Returns: ApiController::success() or ::error()
    public function destroy(int $id): JsonResponse
    {
        $this->service->delete(Category::query()->findOrFail($id));

        return $this->success(null, 'Category deleted successfully.');
    }
}
