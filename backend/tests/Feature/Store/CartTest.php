<?php

namespace Tests\Feature\Store;

use App\Models\Category;
use App\Models\Cart;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_guest_must_sign_in_before_using_cart_endpoints(): void
    {
        $product = $this->createProduct();

        $this->getJson('/api/v1/cart')->assertUnauthorized();

        $this->postJson('/api/v1/cart/items', [
            'product_id' => $product->id,
            'quantity' => 2,
        ])->assertUnauthorized();
    }

    public function test_adding_to_cart_caps_quantity_and_recalculates_sale_price(): void
    {
        $user = User::factory()->create([
            'email' => 'caps@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');
        $product = $this->createProduct([
            'price' => 950.00,
            'sale_price' => null,
            'stock_quantity' => 5,
        ]);
        $token = $user->createToken('cart-cap-token')->plainTextToken;

        $firstAdd = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/cart/items', [
                'product_id' => $product->id,
                'quantity' => 3,
            ]);

        $firstAdd
            ->assertOk()
            ->assertJsonPath('data.item_count', 3)
            ->assertJsonPath('data.items.0.unit_price', 950);

        $product->update([
            'sale_price' => 870.00,
        ]);

        $secondAdd = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/cart/items', [
                'product_id' => $product->id,
                'quantity' => 10,
            ]);

        $secondAdd
            ->assertOk()
            ->assertJsonPath('data.item_count', 5)
            ->assertJsonPath('data.items.0.quantity', 5)
            ->assertJsonPath('data.items.0.unit_price', 870);

        $this->assertSame(4350.0, (float) $secondAdd->json('data.subtotal'));
    }

    public function test_authenticated_user_cart_uses_the_user_cart_record(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        $product = $this->createProduct([
            'price' => 540.00,
            'sale_price' => null,
            'stock_quantity' => 12,
        ]);

        $token = $user->createToken('cart-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/cart/items', [
                'product_id' => $product->id,
                'quantity' => 2,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.session_id', null)
            ->assertJsonPath('data.item_count', 2);

        $this->assertDatabaseHas('carts', [
            'user_id' => $user->id,
            'session_id' => null,
        ]);

        $cart = Cart::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'product_id' => $product->id,
            'quantity' => 2,
        ]);
    }

    public function test_non_customer_roles_cannot_use_cart_endpoints(): void
    {
        $user = User::factory()->create([
            'email' => 'admin-cart@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('admin');
        $product = $this->createProduct();
        $token = $user->createToken('admin-cart-token')->plainTextToken;

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/cart')
            ->assertForbidden();

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/cart/items', [
                'product_id' => $product->id,
                'quantity' => 1,
            ])
            ->assertForbidden();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function createProduct(array $attributes = []): Product
    {
        $category = Category::query()->create([
            'name' => 'Whole Beans '.uniqid(),
            'slug' => 'whole-beans-'.uniqid(),
            'description' => 'Premium beans.',
            'image' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        return Product::query()->create(array_merge([
            'category_id' => $category->id,
            'name' => 'Midnight Reserve '.uniqid(),
            'slug' => 'midnight-reserve-'.uniqid(),
            'short_description' => 'Dark and bold.',
            'description' => 'Detailed description.',
            'price' => 780.00,
            'sale_price' => null,
            'sku' => 'BH-'.strtoupper(substr(uniqid(), -6)),
            'stock_quantity' => 10,
            'low_stock_threshold' => 3,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ], $attributes));
    }
}
