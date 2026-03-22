<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'session_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function scopeOwnedBy(Builder $query, ?User $user, ?string $sessionId = null): Builder
    {
        if ($user) {
            return $query->where('user_id', $user->id);
        }

        return $query
            ->whereNull('user_id')
            ->where('session_id', $sessionId);
    }

    public function itemCount(): int
    {
        if ($this->relationLoaded('items')) {
            return (int) $this->items->sum('quantity');
        }

        return (int) $this->items()->sum('quantity');
    }

    public function subtotal(): float
    {
        if ($this->relationLoaded('items')) {
            return (float) $this->items->sum(function (CartItem $item): float {
                return $item->subtotal();
            });
        }

        return (float) $this->items()
            ->selectRaw('COALESCE(SUM(quantity * unit_price), 0) as subtotal')
            ->value('subtotal');
    }
}
