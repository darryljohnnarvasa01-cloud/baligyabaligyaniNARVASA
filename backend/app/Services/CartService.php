<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function getCart(?User $user, ?string $sessionId): Cart
    {
        $cart = $this->resolveCart($user, $sessionId);

        return $this->loadCart($cart);
    }

    public function addItem(?User $user, ?string $sessionId, int $productId, int $quantity, ?string $selectedSize = null): Cart
    {
        return DB::transaction(function () use ($user, $sessionId, $productId, $quantity, $selectedSize): Cart {
            $cart = $this->resolveCart($user, $sessionId, true, true);
            $product = Product::query()
                ->active()
                ->lockForUpdate()
                ->find($productId);

            if (! $product) {
                throw ValidationException::withMessages([
                    'product_id' => ['The selected product is unavailable.'],
                ]);
            }

            $allowedQuantity = $this->resolveAllowedQuantity($product);

            if ($allowedQuantity <= 0) {
                throw ValidationException::withMessages([
                    'product_id' => ['This product is out of stock.'],
                ]);
            }

            $resolvedSelectedSize = $this->resolveSelectedSize($product, $selectedSize);
            $item = $cart->items()
                ->where('product_id', $product->id)
                ->where('selected_size', $resolvedSelectedSize)
                ->lockForUpdate()
                ->first();

            $baseQuantity = $item ? (int) $item->quantity : 0;
            $finalQuantity = min($allowedQuantity, $baseQuantity + max(1, $quantity));

            $this->upsertItem($cart, $product, $item, $finalQuantity, $resolvedSelectedSize);

            return $this->loadCart($cart->fresh());
        });
    }

    public function updateItem(?User $user, ?string $sessionId, int $itemId, int $quantity): Cart
    {
        return DB::transaction(function () use ($user, $sessionId, $itemId, $quantity): Cart {
            $cart = $this->resolveCart($user, $sessionId, true, true);
            $item = $cart->items()
                ->with('product')
                ->lockForUpdate()
                ->find($itemId);

            if (! $item) {
                throw (new ModelNotFoundException())->setModel(CartItem::class, [$itemId]);
            }

            $product = $item->product;

            if (! $product || ! $product->is_active) {
                throw ValidationException::withMessages([
                    'quantity' => ['This product is no longer available.'],
                ]);
            }

            $allowedQuantity = $this->resolveAllowedQuantity($product);

            if ($allowedQuantity <= 0) {
                throw ValidationException::withMessages([
                    'quantity' => ['This product is out of stock.'],
                ]);
            }

            $finalQuantity = min($allowedQuantity, max(1, $quantity));

            $this->upsertItem(
                $cart,
                $product,
                $item,
                $finalQuantity,
                $this->normalizeSelectedSize($item->selected_size)
            );

            return $this->loadCart($cart->fresh());
        });
    }

    public function removeItem(?User $user, ?string $sessionId, int $itemId): Cart
    {
        return DB::transaction(function () use ($user, $sessionId, $itemId): Cart {
            $cart = $this->resolveCart($user, $sessionId, true, true);
            $item = $cart->items()
                ->lockForUpdate()
                ->find($itemId);

            if (! $item) {
                throw (new ModelNotFoundException())->setModel(CartItem::class, [$itemId]);
            }

            $item->delete();

            return $this->loadCart($cart->fresh());
        });
    }

    public function clear(?User $user, ?string $sessionId): Cart
    {
        return DB::transaction(function () use ($user, $sessionId): Cart {
            $cart = $this->resolveCart($user, $sessionId, true, true);
            $cart->items()->delete();

            return $this->loadCart($cart->fresh());
        });
    }

    public function mergeGuestCartIntoUser(User $user, ?string $sessionId): int
    {
        /** @var Cart $userCart */
        $userCart = $this->resolveCart($user, null, true, true);

        if (! is_string($sessionId) || trim($sessionId) === '') {
            return $this->loadCart($userCart)->itemCount();
        }

        $guestCart = Cart::query()
            ->with(['items.product'])
            ->whereNull('user_id')
            ->where('session_id', trim($sessionId))
            ->lockForUpdate()
            ->first();

        if (! $guestCart) {
            return $this->loadCart($userCart)->itemCount();
        }

        foreach ($guestCart->items as $guestItem) {
            $product = $guestItem->product;

            if (! $product || ! $product->is_active) {
                continue;
            }

            $allowedQuantity = $this->resolveAllowedQuantity($product);

            if ($allowedQuantity <= 0) {
                continue;
            }

            $existingItem = $userCart->items()
                ->where('product_id', $product->id)
                ->where('selected_size', $this->normalizeSelectedSize($guestItem->selected_size))
                ->lockForUpdate()
                ->first();

            $baseQuantity = $existingItem ? (int) $existingItem->quantity : 0;
            $finalQuantity = min($allowedQuantity, $baseQuantity + (int) $guestItem->quantity);

            if ($finalQuantity <= 0) {
                continue;
            }

            $this->upsertItem(
                $userCart,
                $product,
                $existingItem,
                $finalQuantity,
                $this->normalizeSelectedSize($guestItem->selected_size)
            );
        }

        $guestCart->delete();

        return $this->loadCart($userCart->fresh())->itemCount();
    }

    public function currentUnitPrice(Product $product): string
    {
        return number_format($product->currentPrice(), 2, '.', '');
    }

    protected function resolveCart(?User $user, ?string $sessionId, bool $create = true, bool $lock = false): Cart
    {
        $query = Cart::query()
            ->ownedBy($user, $this->normalizeSessionId($sessionId));

        if ($lock) {
            $query->lockForUpdate();
        }

        $cart = $query->first();

        if ($cart) {
            return $cart;
        }

        if (! $create) {
            throw (new ModelNotFoundException())->setModel(Cart::class);
        }

        if (! $user) {
            $normalizedSessionId = $this->normalizeSessionId($sessionId, true);

            return Cart::query()->create([
                'user_id' => null,
                'session_id' => $normalizedSessionId,
            ]);
        }

        return Cart::query()->create([
            'user_id' => $user->id,
            'session_id' => null,
        ]);
    }

    protected function upsertItem(
        Cart $cart,
        Product $product,
        ?CartItem $item,
        int $quantity,
        string $selectedSize = ''
    ): CartItem
    {
        $cartItem = $item ?? $cart->items()->make([
            'product_id' => $product->id,
            'selected_size' => $selectedSize,
        ]);

        $cartItem->fill([
            'selected_size' => $selectedSize,
            'quantity' => $quantity,
            'unit_price' => $this->currentUnitPrice($product),
        ])->save();

        return $cartItem;
    }

    protected function resolveAllowedQuantity(Product $product): int
    {
        return min(10, max(0, (int) $product->stock_quantity));
    }

    protected function resolveSelectedSize(Product $product, ?string $selectedSize): string
    {
        $normalizedSelectedSize = $this->normalizeSelectedSize($selectedSize);
        $sizeOptions = $this->normalizedProductSizeOptions($product);

        if ($sizeOptions === []) {
            return '';
        }

        if ($normalizedSelectedSize === '') {
            throw ValidationException::withMessages([
                'selected_size' => ['Select a size before adding this product.'],
            ]);
        }

        if (! in_array($normalizedSelectedSize, $sizeOptions, true)) {
            throw ValidationException::withMessages([
                'selected_size' => ['The selected size is unavailable for this product.'],
            ]);
        }

        return $normalizedSelectedSize;
    }

    /**
     * @return array<int, string>
     */
    protected function normalizedProductSizeOptions(Product $product): array
    {
        return collect($product->size_options ?? [])
            ->map(fn ($option): string => $this->normalizeSelectedSize($option))
            ->filter()
            ->values()
            ->all();
    }

    protected function normalizeSelectedSize(?string $value): string
    {
        return trim((string) $value);
    }

    protected function normalizeSessionId(?string $sessionId, bool $required = false): ?string
    {
        $normalized = is_string($sessionId) ? trim($sessionId) : null;

        if ($normalized !== null && $normalized !== '') {
            return $normalized;
        }

        if ($required) {
            throw ValidationException::withMessages([
                'session_id' => ['A session_id header is required for guest carts.'],
            ]);
        }

        return null;
    }

    protected function loadCart(Cart $cart): Cart
    {
        return $cart->load([
            'items' => fn ($query) => $query->latest('id'),
            'items.product.category',
            'items.product.primaryImage',
        ]);
    }
}
