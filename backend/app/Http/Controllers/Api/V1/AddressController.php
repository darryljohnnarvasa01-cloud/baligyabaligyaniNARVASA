<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Checkout\StoreAddressRequest;
use App\Http\Requests\Checkout\UpdateAddressRequest;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends ApiController
{
    // [CODEX] E-commerce controller method: index/store/update/destroy/setDefault
    // Model: Address  Request: StoreAddressRequest / UpdateAddressRequest / Request  Resource: AddressResource
    // PayMongo: no
    // Business rules: customers manage only their own addresses, preserve a single default address, and block deletion when an order still references the address.
    // Returns: ApiController::success() or ::error()

    public function index(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $addresses = $user->addresses()
            ->orderByDesc('is_default')
            ->latest('id')
            ->get();

        return $this->success(
            AddressResource::collection($addresses)->resolve($request),
            'Addresses retrieved.'
        );
    }

    public function store(StoreAddressRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $address = DB::transaction(function () use ($request, $user): Address {
            $payload = $request->validated();
            $shouldBeDefault = (bool) ($payload['is_default'] ?? false) || ! $user->addresses()->exists();

            if ($shouldBeDefault) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create([
                'label' => $payload['label'],
                'recipient_name' => $payload['recipient_name'],
                'phone' => $payload['phone'],
                'street' => $payload['street'],
                'barangay' => $payload['barangay'],
                'city' => $payload['city'],
                'province' => $payload['province'],
                'zip_code' => $payload['zip_code'],
                'is_default' => $shouldBeDefault,
            ]);
        });

        return $this->success(
            AddressResource::make($address)->resolve($request),
            'Address saved successfully.',
            201
        );
    }

    public function update(UpdateAddressRequest $request, int $id): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $address = $user->addresses()->find($id);

        if (! $address) {
            return $this->error('Address not found.', [], 404);
        }

        DB::transaction(function () use ($address, $request, $user): void {
            $payload = $request->validated();
            $shouldBeDefault = (bool) ($payload['is_default'] ?? false);

            if ($shouldBeDefault) {
                $user->addresses()
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }

            $address->fill([
                'label' => $payload['label'],
                'recipient_name' => $payload['recipient_name'],
                'phone' => $payload['phone'],
                'street' => $payload['street'],
                'barangay' => $payload['barangay'],
                'city' => $payload['city'],
                'province' => $payload['province'],
                'zip_code' => $payload['zip_code'],
                'is_default' => $shouldBeDefault,
            ])->save();
        });

        return $this->success(
            AddressResource::make($address->fresh())->resolve($request),
            'Address updated successfully.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $address = $user->addresses()->find($id);

        if (! $address) {
            return $this->error('Address not found.', [], 404);
        }

        try {
            DB::transaction(function () use ($address, $user): void {
                $wasDefault = (bool) $address->is_default;
                $address->delete();

                if ($wasDefault) {
                    $replacement = $user->addresses()->latest('id')->first();

                    if ($replacement) {
                        $replacement->forceFill(['is_default' => true])->save();
                    }
                }
            });
        } catch (QueryException) {
            return $this->error('This address is already attached to an order and cannot be deleted.', [], 422);
        }

        return $this->success(null, 'Address deleted successfully.');
    }

    public function setDefault(Request $request, int $id): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return $this->error('Unauthenticated.', [], 401);
        }

        $address = $user->addresses()->find($id);

        if (! $address) {
            return $this->error('Address not found.', [], 404);
        }

        DB::transaction(function () use ($address, $user): void {
            $user->addresses()->update(['is_default' => false]);
            $address->forceFill(['is_default' => true])->save();
        });

        return $this->success(
            AddressResource::make($address->fresh())->resolve($request),
            'Default address updated successfully.'
        );
    }
}
