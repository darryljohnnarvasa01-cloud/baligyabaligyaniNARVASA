<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\DashboardStatsResource;
use App\Services\Admin\AdminDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends ApiController
{
    public function __construct(private readonly AdminDashboardService $service)
    {
    }

    // [CODEX] E-commerce controller method: index
    // Model: Order, Product  Request: Request  Resource: DashboardStatsResource
    // PayMongo: no
    // Business rules: aggregate today's commerce metrics, recent orders, top products, and monthly revenue for the admin dashboard.
    // Returns: ApiController::success() or ::error()
    public function index(Request $request): JsonResponse
    {
        return $this->success(
            DashboardStatsResource::make($this->service->getStats())->resolve($request),
            'Dashboard stats retrieved.'
        );
    }
}
