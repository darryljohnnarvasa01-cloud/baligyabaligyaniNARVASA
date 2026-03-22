<?php

namespace App\Http\Resources;

use App\Models\OrderItem;
use App\Models\OrderStatusLog;
use App\Http\Resources\Concerns\ResolvesPublicAssetUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Order
 */
class OrderResource extends JsonResource
{
    use ResolvesPublicAssetUrls;

    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'order_number' => (string) $this->order_number,
            'user_id' => (int) $this->user_id,
            'rider_id' => $this->rider_id ? (int) $this->rider_id : null,
            'shipping_address_id' => (int) $this->shipping_address_id,
            'coupon_id' => $this->coupon_id ? (int) $this->coupon_id : null,
            'coupon_code' => $this->coupon_code,
            'subtotal' => (float) $this->subtotal,
            'shipping_fee' => (float) $this->shipping_fee,
            'discount_amount' => (float) $this->discount_amount,
            'total_amount' => (float) $this->total_amount,
            'payment_method' => (string) $this->payment_method,
            'payment_status' => (string) $this->payment_status,
            'order_status' => (string) $this->order_status,
            'paymongo_payment_id' => $this->paymongo_payment_id,
            'paymongo_checkout_url' => $this->paymongo_checkout_url,
            'notes' => $this->notes,
            'delivery_proof_url' => $this->resolveProofUrl(),
            'delivery_proof_notes' => $this->delivery_proof_notes,
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'customer' => $this->whenLoaded('customer', fn () => UserResource::make($this->customer)->resolve($request)),
            'rider' => $this->whenLoaded('rider', fn () => UserResource::make($this->rider)->resolve($request)),
            'shipping_address' => $this->whenLoaded('shippingAddress', fn () => AddressResource::make($this->shippingAddress)->resolve($request)),
            'coupon' => $this->whenLoaded('coupon', fn () => CouponResource::make($this->coupon)->resolve($request)),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (OrderItem $item): array => $this->transformItem($item))->values()->all()),
            'status_logs' => $this->whenLoaded('statusLogs', fn () => $this->statusLogs->map(fn (OrderStatusLog $log): array => $this->transformStatusLog($log))->values()->all()),
            'payment' => $this->whenLoaded('payment', function (): ?array {
                if (! $this->payment) {
                    return null;
                }

                return [
                    'id' => (int) $this->payment->id,
                    'order_id' => (int) $this->payment->order_id,
                    'user_id' => (int) $this->payment->user_id,
                    'paymongo_payment_intent_id' => $this->payment->paymongo_payment_intent_id,
                    'paymongo_source_id' => $this->payment->paymongo_source_id,
                    'method' => (string) $this->payment->method,
                    'amount' => (float) $this->payment->amount,
                    'currency' => (string) $this->payment->currency,
                    'status' => (string) $this->payment->status,
                    'paid_at' => $this->payment->paid_at?->toIso8601String(),
                    'created_at' => $this->payment->created_at?->toIso8601String(),
                    'updated_at' => $this->payment->updated_at?->toIso8601String(),
                ];
            }),
        ];
    }

    protected function resolveProofUrl(): ?string
    {
        return $this->resolvePublicAssetUrl($this->delivery_proof_path);
    }

    protected function transformItem(OrderItem $item): array
    {
        $product = $item->relationLoaded('product') ? $item->product : null;
        $primaryImage = $product?->relationLoaded('primaryImage') ? $product->primaryImage : null;
        $imageUrl = $this->resolvePublicAssetUrl($primaryImage?->image_path);

        return [
            'id' => (int) $item->id,
            'product_id' => (int) $item->product_id,
            'product_name' => (string) $item->product_name,
            'product_sku' => (string) $item->product_sku,
            'selected_size' => $item->selected_size !== '' ? (string) $item->selected_size : null,
            'quantity' => (int) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'subtotal' => (float) $item->subtotal,
            'product' => $product ? [
                'id' => (int) $product->id,
                'name' => (string) $product->name,
                'slug' => (string) $product->slug,
                'stock_status' => $product->stockStatus(),
                'image_url' => $imageUrl,
            ] : null,
        ];
    }

    protected function transformStatusLog(OrderStatusLog $log): array
    {
        $changedBy = $log->relationLoaded('changedBy') ? $log->changedBy : null;

        return [
            'id' => (int) $log->id,
            'order_status' => (string) $log->order_status,
            'changed_by' => (int) $log->changed_by,
            'note' => $log->note,
            'created_at' => $log->created_at?->toIso8601String(),
            'user' => $changedBy ? [
                'id' => (int) $changedBy->id,
                'name' => (string) $changedBy->name,
                'email' => (string) $changedBy->email,
            ] : null,
        ];
    }
}
