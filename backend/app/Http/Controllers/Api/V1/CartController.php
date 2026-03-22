<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Store\AddCartItemRequest;
use App\Http\Requests\Store\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Models\User;
use App\Services\CartService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class CartController extends ApiController
{
    public function __construct(protected CartService $cartService)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Cart  Request: Request  Resource: CartResource
    // PayMongo: no
    // Business rules: resolve the current cart by authenticated user or guest session_id header and return items, item_count, and subtotal.
    // Returns: ApiController::success() or ::error()
    public function index(Request $request): JsonResponse
    {
        try {
            $cart = $this->cartService->getCart($this->resolveUser(), $this->resolveSessionId($request));
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        }

        return $this->success(
            CartResource::make($cart)->resolve($request),
            'Cart retrieved.'
        );
    }

    // [CODEX] E-commerce controller method: storeItem
    // Model: Cart, CartItem, Product  Request: AddCartItemRequest  Resource: CartResource
    // PayMongo: no
    // Business rules: add or increment the cart item, cap quantity at min(10, stock), and recalculate the unit price on every add.
    // Returns: ApiController::success() or ::error()
    public function storeItem(AddCartItemRequest $request): JsonResponse
    {
        try {
            $cart = $this->cartService->addItem(
                $this->resolveUser(),
                $this->resolveSessionId($request),
                (int) $request->validated('product_id'),
                (int) $request->validated('quantity'),
                $request->validated('selected_size')
            );
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        }

        return $this->success(
            CartResource::make($cart)->resolve($request),
            'Cart updated.'
        );
    }

    // [CODEX] E-commerce controller method: updateItem
    // Model: Cart, CartItem, Product  Request: UpdateCartItemRequest  Resource: CartResource
    // PayMongo: no
    // Business rules: update an existing cart item quantity, cap it at min(10, stock), and keep the item scoped to the current cart owner only.
    // Returns: ApiController::success() or ::error()
    public function updateItem(UpdateCartItemRequest $request, int $id): JsonResponse
    {
        try {
            $cart = $this->cartService->updateItem(
                $this->resolveUser(),
                $this->resolveSessionId($request),
                $id,
                (int) $request->validated('quantity')
            );
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        } catch (ModelNotFoundException) {
            return $this->error('Cart item not found.', [], 404);
        }

        return $this->success(
            CartResource::make($cart)->resolve($request),
            'Cart updated.'
        );
    }

    // [CODEX] E-commerce controller method: destroyItem
    // Model: Cart, CartItem  Request: Request  Resource: CartResource
    // PayMongo: no
    // Business rules: remove a single cart item that belongs to the current user cart or guest session cart.
    // Returns: ApiController::success() or ::error()
    public function destroyItem(Request $request, int $id): JsonResponse
    {
        try {
            $cart = $this->cartService->removeItem(
                $this->resolveUser(),
                $this->resolveSessionId($request),
                $id
            );
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        } catch (ModelNotFoundException) {
            return $this->error('Cart item not found.', [], 404);
        }

        return $this->success(
            CartResource::make($cart)->resolve($request),
            'Item removed from cart.'
        );
    }

    // [CODEX] E-commerce controller method: destroy
    // Model: Cart, CartItem  Request: Request  Resource: CartResource
    // PayMongo: no
    // Business rules: clear every cart item for the current user cart or guest session cart while keeping the cart record for reuse.
    // Returns: ApiController::success() or ::error()
    public function destroy(Request $request): JsonResponse
    {
        try {
            $cart = $this->cartService->clear($this->resolveUser(), $this->resolveSessionId($request));
        } catch (ValidationException $exception) {
            return $this->error('Validation failed.', $exception->errors(), 422);
        }

        return $this->success(
            CartResource::make($cart)->resolve($request),
            'Cart cleared.'
        );
    }

    protected function resolveSessionId(Request $request): ?string
    {
        return $request->header('X-Session-Id')
            ?? $request->header('session_id')
            ?? $request->input('session_id');
    }

    protected function resolveUser(): ?User
    {
        /** @var User|null $user */
        $user = Auth::guard('sanctum')->user();

        return $user;
    }
}
