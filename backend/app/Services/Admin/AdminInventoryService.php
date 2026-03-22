<?php

namespace App\Services\Admin;

use App\Models\InventoryLog;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminInventoryService
{
    public function restock(Product $product, int $quantityToAdd, ?string $note, User $actor): Product
    {
        return $this->changeStockByDelta(
            $product,
            $quantityToAdd,
            'restock',
            null,
            null,
            null,
            $note ?: 'Product restocked by admin.',
            (int) $actor->id
        );
    }

    public function adjustStock(Product $product, int $newQuantity, string $adjustmentType, string $note, int $actorId): Product
    {
        if (! in_array($adjustmentType, InventoryLog::ADJUSTMENT_TYPES, true)) {
            throw ValidationException::withMessages([
                'adjustment_type' => ['The selected adjustment type is invalid.'],
            ]);
        }

        return DB::transaction(function () use ($product, $newQuantity, $adjustmentType, $note, $actorId): Product {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $currentStock = (int) $lockedProduct->stock_quantity;
            $delta = $newQuantity - $currentStock;

            return $this->persistStockMutation(
                $lockedProduct,
                $newQuantity,
                $delta,
                'adjustment',
                $adjustmentType,
                null,
                'admin_adjustment',
                trim($note) !== '' ? trim($note) : 'Product stock adjusted by admin.',
                $actorId,
                true
            );
        });
    }

    public function deductStock(
        Product $product,
        int $quantityToDeduct,
        string $note,
        int $actorId,
        ?int $referenceId = null,
        ?string $referenceType = 'checkout',
    ): Product {
        return $this->changeStockByDelta(
            $product,
            -1 * $quantityToDeduct,
            'deduction',
            null,
            $referenceId,
            $referenceType,
            $note,
            $actorId
        );
    }

    public function restoreStock(
        Product $product,
        int $quantityToRestore,
        string $note,
        int $actorId,
        ?int $referenceId = null,
        ?string $referenceType = 'return',
    ): Product {
        return $this->changeStockByDelta(
            $product,
            $quantityToRestore,
            'return',
            null,
            $referenceId,
            $referenceType,
            $note,
            $actorId
        );
    }

    protected function changeStockByDelta(
        Product $product,
        int $quantityChange,
        string $type,
        ?string $adjustmentType,
        ?int $referenceId,
        ?string $referenceType,
        ?string $note,
        int $actorId,
        bool $latestLogOnly = false,
    ): Product {
        return DB::transaction(function () use (
            $product,
            $quantityChange,
            $type,
            $adjustmentType,
            $referenceId,
            $referenceType,
            $note,
            $actorId,
            $latestLogOnly
        ): Product {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $nextStock = (int) $lockedProduct->stock_quantity + $quantityChange;

            if ($nextStock < 0) {
                throw ValidationException::withMessages([
                    'stock_quantity' => ['The resulting stock quantity cannot be negative.'],
                ]);
            }

            return $this->persistStockMutation(
                $lockedProduct,
                $nextStock,
                $quantityChange,
                $type,
                $adjustmentType,
                $referenceId,
                $referenceType,
                $note,
                $actorId,
                $latestLogOnly
            );
        });
    }

    protected function persistStockMutation(
        Product $product,
        int $newQuantity,
        int $quantityChange,
        string $type,
        ?string $adjustmentType,
        ?int $referenceId,
        ?string $referenceType,
        ?string $note,
        int $actorId,
        bool $latestLogOnly = false,
    ): Product {
        $this->ensureActorId($actorId);

        $product->forceFill([
            'stock_quantity' => $newQuantity,
        ])->save();

        InventoryLog::query()->create([
            'product_id' => $product->id,
            'type' => $type,
            'adjustment_type' => $adjustmentType,
            'quantity_change' => $quantityChange,
            'quantity_after' => $newQuantity,
            'reference_id' => $referenceId,
            'reference_type' => $referenceType,
            'note' => $note,
            'created_by' => $actorId,
        ]);

        return $this->loadInventoryProduct((int) $product->id, $latestLogOnly);
    }

    protected function loadInventoryProduct(int $productId, bool $latestLogOnly = false): Product
    {
        return Product::query()
            ->with([
                'primaryImage',
                'inventoryLogs' => function ($query) use ($latestLogOnly): void {
                    $query->latest('id')->with('createdBy');

                    if ($latestLogOnly) {
                        $query->limit(1);
                    }
                },
            ])
            ->findOrFail($productId);
    }

    protected function ensureActorId(int $actorId): void
    {
        if ($actorId <= 0) {
            throw ValidationException::withMessages([
                'user' => ['An authenticated actor is required for inventory updates.'],
            ]);
        }
    }
}
