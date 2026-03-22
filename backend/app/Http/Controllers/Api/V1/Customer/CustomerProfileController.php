<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Customer\CustomerProfileUpdateRequest;
use App\Http\Resources\AddressResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerProfileController extends ApiController
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    // [CODEX] E-commerce controller method: show
    // Model: User, Address  Request: Request  Resource: UserResource
    // PayMongo: no
    // Business rules: return the authenticated customer profile together with the saved addresses, ordered by default address first.
    // Returns: ApiController::success() or ::error()
    public function show(Request $request): JsonResponse
    {
        /** @var User|null $customer */
        $customer = $request->user();

        if (! $customer) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $customer->load([
            'roles',
            'addresses' => fn ($query) => $query->orderByDesc('is_default')->latest('id'),
        ]);

        return $this->success([
            'user' => UserResource::make($customer)->resolve($request),
            'addresses' => AddressResource::collection($customer->addresses)->resolve($request),
        ], 'Customer profile retrieved.');
    }

    // [CODEX] E-commerce controller method: update
    // Model: User  Request: CustomerProfileUpdateRequest  Resource: UserResource
    // PayMongo: no
    // Business rules: allow the customer to update only their name and phone while preserving the account response contract.
    // Returns: ApiController::success() or ::error()
    public function update(CustomerProfileUpdateRequest $request): JsonResponse
    {
        /** @var User|null $customer */
        $customer = $request->user();

        if (! $customer) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $updatedCustomer = $this->authService->updateProfile($customer, $request->validated());
        $updatedCustomer->load([
            'roles',
            'addresses' => fn ($query) => $query->orderByDesc('is_default')->latest('id'),
        ]);

        return $this->success([
            'user' => UserResource::make($updatedCustomer)->resolve($request),
            'addresses' => AddressResource::collection($updatedCustomer->addresses)->resolve($request),
        ], 'Customer profile updated successfully.');
    }
}
