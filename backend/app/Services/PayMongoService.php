<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class PayMongoService
{
    // [CODEX] PayMongo API call: GCash source / PayMaya checkout session / payment helpers
    // Endpoint: POST https://api.paymongo.com/v1/{resource}
    // Auth: Basic base64(secret_key:) for secret calls, public key for source creation when configured
    // Amount: in centavos (multiply PHP amount x 100)
    // Redirect URLs: success + failed from .env
    // Returns: { checkout_url, source_id }

    // [CODEX] PayMongo API call: GCash source
    // Endpoint: POST https://api.paymongo.com/v1/sources
    // Auth: Basic base64(secret_key:) or configured public key for source creation
    // Amount: in centavos (multiply PHP amount x 100)
    // Redirect URLs: success + failed from .env
    // Returns: { checkout_url, source_id }
    public function createGCashSource(float $amount, string $orderNumber, array $redirectUrls): array
    {
        return $this->createSource($amount, 'gcash', $orderNumber, $redirectUrls);
    }

    // [CODEX] PayMongo API call: PayMaya checkout session
    // Endpoint: POST https://api.paymongo.com/v1/checkout_sessions
    // Auth: Basic base64(secret_key:)
    // Amount: in centavos (multiply PHP amount x 100)
    // Redirect URLs: success + failed from .env
    // Returns: { checkout_url, checkout_session_id, payment_intent_id }
    public function createPayMayaCheckoutSession(float $amount, string $orderNumber, array $redirectUrls): array
    {
        $payload = $this->sendSecretRequest('checkout_sessions', [
            'data' => [
                'attributes' => [
                    'cancel_url' => $redirectUrls['failed'] ?? $this->redirectUrls($orderNumber)['failed'],
                    'success_url' => $redirectUrls['success'] ?? $this->redirectUrls($orderNumber)['success'],
                    'payment_method_types' => ['paymaya'],
                    'line_items' => [[
                        'currency' => 'PHP',
                        'amount' => $this->amountToCentavos($amount),
                        'name' => 'BrewHaus order '.$orderNumber,
                        'quantity' => 1,
                    ]],
                ],
            ],
        ], 'Unable to create the PayMongo checkout session.');

        return [
            'checkout_session_id' => data_get($payload, 'data.id'),
            'checkout_url' => data_get($payload, 'data.attributes.checkout_url'),
            'payment_intent_id' => data_get($payload, 'data.attributes.payment_intent.id'),
            'response' => $payload,
        ];
    }

    // [CODEX] PayMongo API call: payment intent
    // Endpoint: POST https://api.paymongo.com/v1/payment_intents
    // Auth: Basic base64(secret_key:)
    // Amount: in centavos (multiply PHP amount x 100)
    // Redirect URLs: success + failed from .env
    // Returns: { payment_intent_id, response }
    public function createPaymentIntent(float $amount): array
    {
        $payload = $this->sendSecretRequest('payment_intents', [
            'data' => [
                'attributes' => [
                    'amount' => $this->amountToCentavos($amount),
                    'currency' => 'PHP',
                    'capture_type' => 'automatic',
                    'payment_method_allowed' => ['gcash', 'paymaya'],
                ],
            ],
        ], 'Unable to create the PayMongo payment intent.');

        return [
            'payment_intent_id' => data_get($payload, 'data.id'),
            'response' => $payload,
        ];
    }

    // [CODEX] PayMongo API call: attach payment method
    // Endpoint: POST https://api.paymongo.com/v1/payment_intents/{intentId}/attach
    // Auth: Basic base64(secret_key:)
    // Amount: in centavos (multiply PHP amount x 100)
    // Redirect URLs: success + failed from .env
    // Returns: { payment_intent_id, response }
    public function attachPaymentMethod(string $intentId, string $methodId): array
    {
        $payload = $this->sendSecretRequest('payment_intents/'.$intentId.'/attach', [
            'data' => [
                'attributes' => [
                    'payment_method' => $methodId,
                    'return_url' => rtrim($this->frontendUrl(), '/').'/checkout/success',
                ],
            ],
        ], 'Unable to attach the PayMongo payment method.');

        return [
            'payment_intent_id' => $intentId,
            'response' => $payload,
        ];
    }

    public function createPaymentFromSource(string $sourceId, float $amount, string $description): array
    {
        $payload = $this->sendSecretRequest('payments', [
            'data' => [
                'attributes' => [
                    'amount' => $this->amountToCentavos($amount),
                    'currency' => 'PHP',
                    'description' => $description,
                    'source' => [
                        'id' => $sourceId,
                        'type' => 'source',
                    ],
                ],
            ],
        ], 'Unable to create the PayMongo payment.');

        return [
            'payment_id' => data_get($payload, 'data.id'),
            'response' => $payload,
        ];
    }

    public function retrieveSource(string $sourceId): array
    {
        return $this->sendSecretGetRequest(
            'sources/'.$sourceId,
            'Unable to retrieve the PayMongo source.'
        );
    }

    public function retrievePayment(string $paymentId): array
    {
        return $this->sendSecretGetRequest(
            'payments/'.$paymentId,
            'Unable to retrieve the PayMongo payment.'
        );
    }

    public function retrievePaymentIntent(string $paymentIntentId): array
    {
        return $this->sendSecretGetRequest(
            'payment_intents/'.$paymentIntentId,
            'Unable to retrieve the PayMongo payment intent.'
        );
    }

    // [CODEX] PayMongo API call: verify webhook signature
    // Endpoint: POST https://api.paymongo.com/v1/webhooks
    // Auth: Basic base64(secret_key:) for webhook registration; verification uses webhook secret locally
    // Amount: in centavos (multiply PHP amount x 100)
    // Redirect URLs: success + failed from .env
    // Returns: boolean
    public function verifyWebhookSignature(string $payload, ?string $signatureHeader): bool
    {
        $secret = (string) config('services.paymongo.webhook_secret');

        if ($secret === '' || ! is_string($signatureHeader) || trim($signatureHeader) === '') {
            return false;
        }

        $parts = $this->parseSignatureHeader($signatureHeader);
        $timestamp = isset($parts['t']) ? (int) $parts['t'] : 0;
        $testSignature = $parts['te'] ?? null;
        $liveSignature = $parts['li'] ?? null;

        if ($timestamp <= 0 || (! $testSignature && ! $liveSignature)) {
            return false;
        }

        $tolerance = (int) config('services.paymongo.webhook_tolerance_seconds', 300);

        if ($tolerance > 0 && abs(time() - $timestamp) > $tolerance) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.'.'.$payload, $secret);

        return (is_string($testSignature) && hash_equals($expected, $testSignature))
            || (is_string($liveSignature) && hash_equals($expected, $liveSignature));
    }

    public function redirectUrls(string $orderNumber): array
    {
        $frontendUrl = rtrim($this->frontendUrl(), '/');

        return [
            'success' => $frontendUrl.'/checkout/success?order='.$orderNumber,
            'failed' => $frontendUrl.'/checkout/failed?order='.$orderNumber,
        ];
    }

    protected function createSource(float $amount, string $type, string $orderNumber, array $redirectUrls): array
    {
        $payload = $this->sendPublicRequest('sources', [
            'data' => [
                'attributes' => [
                    'amount' => $this->amountToCentavos($amount),
                    'currency' => 'PHP',
                    'type' => $type,
                    'redirect' => [
                        'success' => $redirectUrls['success'] ?? $this->redirectUrls($orderNumber)['success'],
                        'failed' => $redirectUrls['failed'] ?? $this->redirectUrls($orderNumber)['failed'],
                    ],
                ],
            ],
        ], 'Unable to create the PayMongo checkout source.');

        return [
            'source_id' => data_get($payload, 'data.id'),
            'checkout_url' => data_get($payload, 'data.attributes.redirect.checkout_url'),
            'response' => $payload,
        ];
    }

    protected function sendPublicRequest(string $endpoint, array $payload, string $fallbackMessage): array
    {
        $key = (string) (config('services.paymongo.public_key') ?: config('services.paymongo.secret_key'));

        if ($key === '') {
            throw new RuntimeException('PayMongo public key is not configured.');
        }

        return $this->sendRequest($this->requestWithKey($key), $endpoint, $payload, $fallbackMessage);
    }

    protected function sendSecretRequest(string $endpoint, array $payload, string $fallbackMessage): array
    {
        $key = (string) config('services.paymongo.secret_key');

        if ($key === '') {
            throw new RuntimeException('PayMongo secret key is not configured.');
        }

        return $this->sendRequest($this->requestWithKey($key), $endpoint, $payload, $fallbackMessage);
    }

    protected function sendSecretGetRequest(string $endpoint, string $fallbackMessage): array
    {
        $key = (string) config('services.paymongo.secret_key');

        if ($key === '') {
            throw new RuntimeException('PayMongo secret key is not configured.');
        }

        return $this->sendGetRequest($this->requestWithKey($key), $endpoint, $fallbackMessage);
    }

    protected function sendRequest(PendingRequest $request, string $endpoint, array $payload, string $fallbackMessage): array
    {
        $response = $request->post(ltrim($endpoint, '/'), $payload);
        $body = $response->json() ?? [];

        if ($response->failed()) {
            throw ValidationException::withMessages([
                'payment' => [$this->extractApiError($body, $fallbackMessage)],
            ]);
        }

        return $body;
    }

    protected function sendGetRequest(PendingRequest $request, string $endpoint, string $fallbackMessage): array
    {
        $response = $request->get(ltrim($endpoint, '/'));
        $body = $response->json() ?? [];

        if ($response->failed()) {
            throw ValidationException::withMessages([
                'payment' => [$this->extractApiError($body, $fallbackMessage)],
            ]);
        }

        return $body;
    }

    protected function requestWithKey(string $key): PendingRequest
    {
        return Http::baseUrl($this->baseUrl())
            ->acceptJson()
            ->asJson()
            ->withBasicAuth($key, '');
    }

    protected function amountToCentavos(float $amount): int
    {
        return (int) round($amount * 100);
    }

    protected function parseSignatureHeader(string $signatureHeader): array
    {
        $parsed = [];

        foreach (explode(',', $signatureHeader) as $segment) {
            $parts = explode('=', trim($segment), 2);

            if (count($parts) !== 2) {
                continue;
            }

            $parsed[trim($parts[0])] = trim($parts[1]);
        }

        return $parsed;
    }

    protected function extractApiError(array $payload, string $fallbackMessage): string
    {
        return (string) (
            data_get($payload, 'errors.0.detail')
            ?? data_get($payload, 'errors.0.code')
            ?? data_get($payload, 'message')
            ?? $fallbackMessage
        );
    }

    protected function baseUrl(): string
    {
        return rtrim((string) config('services.paymongo.base_url', 'https://api.paymongo.com/v1'), '/').'/';
    }

    protected function frontendUrl(): string
    {
        return (string) config(
            'services.frontend_url',
            config('services.paymongo.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'))
        );
    }
}
