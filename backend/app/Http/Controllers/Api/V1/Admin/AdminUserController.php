<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Admin\IndexAdminUsersRequest;
use App\Http\Requests\Admin\StoreAdminRiderRequest;
use App\Http\Resources\AdminUserResource;
use App\Repositories\UserRepository;
use App\Services\Admin\AdminUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends ApiController
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly AdminUserService $service,
    )
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: User  Request: IndexAdminUsersRequest  Resource: AdminUserResource
    // PayMongo: no
    // Business rules: Return paginated admin user results with role-aware filtering for admin, customer, and rider accounts.
    // Returns: ApiController::success() or ::error()
    public function index(IndexAdminUsersRequest $request): JsonResponse
    {
        $paginator = $this->users->paginateForAdmin($request->validated());

        return $this->paginated(
            $paginator,
            AdminUserResource::collection($paginator->getCollection())->resolve($request)
        );
    }

    // [CODEX] E-commerce controller method: storeRider
    // Model: User  Request: StoreAdminRiderRequest  Resource: AdminUserResource
    // PayMongo: no
    // Business rules: Allow admins to create active or inactive rider accounts directly from the operations directory.
    // Returns: ApiController::success() or ::error()
    public function storeRider(StoreAdminRiderRequest $request): JsonResponse
    {
        $user = $this->service->createRider($request->validated());

        return $this->success(
            AdminUserResource::make($user)->resolve($request),
            'Rider created successfully.',
            201
        );
    }
}
