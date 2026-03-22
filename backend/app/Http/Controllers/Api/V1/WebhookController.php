<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\CheckoutService;
use App\Services\PayMongoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends ApiController
{
    public function __construct(
        protected CheckoutService $checkoutService,
        protected PayMongoService $payMongoService,
    ) {
    }

    // [CODEX] E-commerce controller method: handlePayMongo
    // Model: Order, Payment  Request: Request  Resource: none
    // PayMongo: yes - verify the webhook signature and process payment, checkout session, and source events
    // Business rules: reject invalid signatures, keep the handler idempotent, and restore stock when an online payment fails.
    // Returns: ApiController::success() or ::error()
    public function handlePayMongo(Request $request): JsonResponse
    {
        $rawPayload = (string) $request->getContent();
        $signature = $request->header('Paymongo-Signature') ?? $request->header('X-Paymongo-Signature');

        if (! $this->payMongoService->verifyWebhookSignature($rawPayload, $signature)) {
            return $this->error('Invalid webhook signature.', [], 401);
        }

        $payload = json_decode($rawPayload, true);

        if (! is_array($payload)) {
            return $this->error('Invalid webhook payload.', [], 422);
        }

        $eventType = (string) data_get($payload, 'data.attributes.type', '');
        $resource = data_get($payload, 'data.attributes.data');

        if (! is_array($resource)) {
            return $this->error('Invalid webhook payload.', [], 422);
        }

        match ($eventType) {
            'payment.paid' => $this->checkoutService->markPaymentPaid($resource),
            'payment.failed' => $this->checkoutService->markPaymentFailed($resource),
            'checkout_session.payment.paid' => $this->checkoutService->markCheckoutSessionPaid($resource),
            'source.chargeable' => $this->checkoutService->handleChargeableSource($resource),
            default => null,
        };

        return $this->success([
            'event_type' => $eventType,
        ], 'Webhook processed.');
    }
}
