<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('products', 'size_options')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->json('size_options')->nullable()->after('weight_grams');
            });
        }

        if (! Schema::hasColumn('cart_items', 'selected_size')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->string('selected_size', 50)->default('')->after('product_id');
            });
        }

        if (! $this->hasIndex('cart_items', 'cart_items_cart_id_idx')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->index('cart_id', 'cart_items_cart_id_idx');
            });
        }

        if ($this->hasIndex('cart_items', 'cart_items_cart_id_product_id_unique')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->dropUnique('cart_items_cart_id_product_id_unique');
            });
        }

        if (! $this->hasIndex('cart_items', 'cart_items_cart_product_size_unique')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->unique(['cart_id', 'product_id', 'selected_size'], 'cart_items_cart_product_size_unique');
            });
        }

        if (! Schema::hasColumn('order_items', 'selected_size')) {
            Schema::table('order_items', function (Blueprint $table): void {
                $table->string('selected_size', 50)->nullable()->after('product_sku');
            });
        }

        $this->backfillDerivedProductSizes();
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'selected_size')) {
            Schema::table('order_items', function (Blueprint $table): void {
                $table->dropColumn('selected_size');
            });
        }

        if ($this->hasIndex('cart_items', 'cart_items_cart_product_size_unique')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->dropUnique('cart_items_cart_product_size_unique');
            });
        }

        if (Schema::hasColumn('cart_items', 'selected_size')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->dropColumn('selected_size');
            });
        }

        if (! $this->hasIndex('cart_items', 'cart_items_cart_id_product_id_unique')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->unique(['cart_id', 'product_id']);
            });
        }

        if ($this->hasIndex('cart_items', 'cart_items_cart_id_idx')) {
            Schema::table('cart_items', function (Blueprint $table): void {
                $table->dropIndex('cart_items_cart_id_idx');
            });
        }

        if (Schema::hasColumn('products', 'size_options')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->dropColumn('size_options');
            });
        }
    }

    protected function backfillDerivedProductSizes(): void
    {
        DB::table('products')
            ->select(['id', 'short_description', 'description'])
            ->orderBy('id')
            ->chunkById(100, function ($products): void {
                foreach ($products as $product) {
                    $sizeOptions = $this->deriveSizeOptions($product->short_description, $product->description);

                    if ($sizeOptions === []) {
                        continue;
                    }

                    DB::table('products')
                        ->where('id', $product->id)
                        ->update(['size_options' => json_encode($sizeOptions, JSON_UNESCAPED_UNICODE)]);
                }
            });
    }

    protected function hasIndex(string $table, string $indexName): bool
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('{$table}')"))
                ->pluck('name')
                ->contains($indexName);
        }

        return collect(DB::select("SHOW INDEX FROM `{$table}`"))
            ->pluck('Key_name')
            ->contains($indexName);
    }

    /**
     * @return array<int, string>
     */
    protected function deriveSizeOptions(?string $shortDescription, ?string $description): array
    {
        $source = trim(implode("\n", array_filter([$shortDescription, $description])));

        if ($source === '') {
            return [];
        }

        $options = [];

        if (preg_match_all('/(?:^|\n)\s*size\s*:\s*([^\r\n]+)/im', $source, $matches)) {
            foreach ($matches[1] as $value) {
                foreach (preg_split('/\s*[,\/|]\s*/', (string) $value) ?: [] as $option) {
                    $normalized = $this->normalizeSizeOption($option);

                    if ($normalized !== '') {
                        $options[] = $normalized;
                    }
                }
            }
        } elseif (preg_match('/one[- ]size(?:[- ]fits[- ]all)?/i', $source)) {
            $options[] = 'One size fits most';
        }

        return array_values(array_unique($options));
    }

    protected function normalizeSizeOption(?string $value): string
    {
        $normalized = preg_replace('/\s+/', ' ', trim((string) $value)) ?? '';

        if ($normalized === '') {
            return '';
        }

        if (preg_match('/^one[- ]size(?:[- ]fits[- ]all)?$/i', $normalized)) {
            return 'One size fits most';
        }

        if (preg_match('/^(xxxl|xxl|xl|xs|s|m|l)$/i', $normalized)) {
            return strtoupper($normalized);
        }

        return ucfirst($normalized);
    }
};
