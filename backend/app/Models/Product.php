<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'short_description',
        'description',
        'price',
        'sale_price',
        'sku',
        'stock_quantity',
        'low_stock_threshold',
        'weight_grams',
        'size_options',
        'is_active',
        'is_featured',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'sale_price' => 'decimal:2',
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
            'weight_grams' => 'integer',
            'size_options' => 'array',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(ProductTag::class, 'product_tag_pivot', 'product_id', 'tag_id');
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function inventoryLogs(): HasMany
    {
        return $this->hasMany(InventoryLog::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    public function scopeOnSale(Builder $query): Builder
    {
        return $query
            ->whereNotNull('sale_price')
            ->whereColumn('sale_price', '<', 'price');
    }

    public function isOnSale(): bool
    {
        if ($this->sale_price === null) {
            return false;
        }

        return (float) $this->sale_price < (float) $this->price;
    }

    public function salePercentage(): int
    {
        if (! $this->isOnSale()) {
            return 0;
        }

        $price = (float) $this->price;

        if ($price <= 0) {
            return 0;
        }

        return (int) round((($price - (float) $this->sale_price) / $price) * 100);
    }

    public function stockStatus(): string
    {
        $stockQuantity = (int) $this->stock_quantity;
        $lowStockThreshold = (int) $this->low_stock_threshold;

        if ($stockQuantity <= 0) {
            return 'out_of_stock';
        }

        if ($stockQuantity <= $lowStockThreshold) {
            return 'low_stock';
        }

        return 'in_stock';
    }

    public function currentPrice(): float
    {
        return $this->isOnSale()
            ? (float) $this->sale_price
            : (float) $this->price;
    }
}
