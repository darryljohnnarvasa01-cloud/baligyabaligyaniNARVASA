<?php

use App\Http\Controllers\Api\V1\AddressController;
use App\Http\Controllers\Api\V1\Admin\AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\AdminCouponController;
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminInventoryController;
use App\Http\Controllers\Api\V1\Admin\AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\AdminProductController;
use App\Http\Controllers\Api\V1\Admin\AdminRiderController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\Customer\CustomerOrderController;
use App\Http\Controllers\Api\V1\Customer\CustomerProfileController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\Rider\RiderOrderController;
use App\Http\Controllers\Api\V1\WebhookController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('health', function (Request $request) {
        return response()->json([
            'success' => true,
            'message' => 'API is healthy.',
            'data' => [
                'timestamp' => now()->toIso8601String(),
            ],
        ]);
    });

    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::post('google', [AuthController::class, 'googleLogin'])->middleware('throttle:login');
        Route::post('email/verification-notification', [AuthController::class, 'sendVerificationNotification'])
            ->middleware('throttle:verification');
        Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
            ->middleware('throttle:verification')
            ->name('verification.verify');

        Route::middleware(['auth:sanctum', 'role:admin|customer|rider,sanctum'])->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('profile', [AuthController::class, 'updateProfile']);
            Route::put('password', [AuthController::class, 'updatePassword']);
        });
    });

    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/{slug}', [ProductController::class, 'show']);
    Route::get('categories', [CategoryController::class, 'index']);

    Route::post('webhooks/paymongo', [WebhookController::class, 'handlePayMongo']);

    Route::middleware(['auth:sanctum', 'role:customer,sanctum'])->group(function () {
        Route::get('cart', [CartController::class, 'index']);
        Route::post('cart/items', [CartController::class, 'storeItem']);
        Route::patch('cart/items/{id}', [CartController::class, 'updateItem']);
        Route::delete('cart/items/{id}', [CartController::class, 'destroyItem']);
        Route::delete('cart', [CartController::class, 'destroy']);

        Route::post('checkout/coupon', [CheckoutController::class, 'applyCoupon']);
        Route::post('checkout', [CheckoutController::class, 'initiate']);
        Route::get('checkout/order/{number}', [PaymentController::class, 'showOrder']);

        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses', [AddressController::class, 'store']);
        Route::put('addresses/{id}', [AddressController::class, 'update']);
        Route::delete('addresses/{id}', [AddressController::class, 'destroy']);
        Route::patch('addresses/{id}/default', [AddressController::class, 'setDefault']);
    });

    Route::middleware(['auth:sanctum', 'role:admin,sanctum'])->prefix('admin')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index']);
        Route::get('orders', [AdminOrderController::class, 'index']);
        Route::get('orders/{id}', [AdminOrderController::class, 'show']);
        Route::patch('orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
        Route::patch('orders/{id}/assign', [AdminOrderController::class, 'assignRider']);

        Route::get('products', [AdminProductController::class, 'index']);
        Route::post('products', [AdminProductController::class, 'store']);
        Route::get('products/{id}', [AdminProductController::class, 'show']);
        Route::put('products/{id}', [AdminProductController::class, 'update']);
        Route::delete('products/{id}', [AdminProductController::class, 'destroy']);

        Route::get('categories', [AdminCategoryController::class, 'index']);
        Route::post('categories', [AdminCategoryController::class, 'store']);
        Route::put('categories/{id}', [AdminCategoryController::class, 'update']);
        Route::delete('categories/{id}', [AdminCategoryController::class, 'destroy']);

        Route::get('coupons', [AdminCouponController::class, 'index']);
        Route::post('coupons', [AdminCouponController::class, 'store']);
        Route::put('coupons/{id}', [AdminCouponController::class, 'update']);
        Route::delete('coupons/{id}', [AdminCouponController::class, 'destroy']);

        Route::get('users', [AdminUserController::class, 'index']);
        Route::post('users/riders', [AdminUserController::class, 'storeRider']);

        Route::get('riders/available', [AdminRiderController::class, 'available']);

        Route::get('inventory', [AdminInventoryController::class, 'index']);
        Route::post('inventory/{id}/restock', [AdminInventoryController::class, 'restock']);
        Route::post('inventory/{product}/adjust', [AdminInventoryController::class, 'adjust']);
    });

    Route::middleware(['auth:sanctum', 'role:customer,sanctum'])->prefix('customer')->group(function () {
        Route::get('profile', [CustomerProfileController::class, 'show']);
        Route::put('profile', [CustomerProfileController::class, 'update']);
        Route::get('orders', [CustomerOrderController::class, 'index']);
        Route::post('orders/{number}/cancel', [CustomerOrderController::class, 'cancel']);
        Route::get('orders/{number}', [CustomerOrderController::class, 'show']);
    });

    Route::middleware(['auth:sanctum', 'role:rider,sanctum'])->prefix('rider')->group(function () {
        Route::get('summary', [RiderOrderController::class, 'summary']);
        Route::put('location', [RiderOrderController::class, 'updateLocation']);
        Route::get('orders', [RiderOrderController::class, 'index']);
        Route::get('orders/history', [RiderOrderController::class, 'history']);
        Route::get('orders/queue', [RiderOrderController::class, 'queue']);
        Route::get('orders/{id}', [RiderOrderController::class, 'show']);
        Route::patch('orders/{id}/accept', [RiderOrderController::class, 'accept']);
        Route::patch('orders/{id}/pickup', [RiderOrderController::class, 'pickup']);
        Route::post('orders/{id}/proof', [RiderOrderController::class, 'uploadProof']);
        Route::post('orders/{id}/issue', [RiderOrderController::class, 'reportIssue']);
        Route::patch('orders/{id}/deliver', [RiderOrderController::class, 'deliver']);
    });
});
