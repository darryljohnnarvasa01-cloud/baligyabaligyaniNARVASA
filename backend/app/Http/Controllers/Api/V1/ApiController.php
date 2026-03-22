<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

class ApiController extends Controller
{
    /**
     * Standard success response.
     *
     * @param  mixed  $data
     * @param  string  $message
     * @param  int  $code
     */
    protected function success(mixed $data = null, string $message = 'OK', int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Standard error response.
     *
     * @param  string  $message
     * @param  array<string, array<int, string>|string>  $errors
     * @param  int  $code
     */
    protected function error(string $message = 'Validation failed.', array $errors = [], int $code = 422): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }

    /**
     * Standard paginated success response.
     *
     * @param  array<int, mixed>  $items
     */
    protected function paginated(LengthAwarePaginator $paginator, array $items, int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                    'has_more_pages' => $paginator->hasMorePages(),
                ],
            ],
        ], $code);
    }
}
