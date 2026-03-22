<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\UserResource;
use App\Repositories\UserRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRiderController extends ApiController
{
    public function __construct(private readonly UserRepository $users)
    {
    }

    // [CODEX] E-commerce controller method: available
    // Model: User, Order  Request: Request  Resource: UserResource
    // PayMongo: no
    // Business rules: list active riders who are not already handling packed or out-for-delivery orders.
    // Returns: ApiController::success() or ::error()
    public function available(Request $request): JsonResponse
    {
        return $this->success(
            UserResource::collection($this->users->getAvailableRiders())->resolve($request),
            'Available riders retrieved.'
        );
    }
}
