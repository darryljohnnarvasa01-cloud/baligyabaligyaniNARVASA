<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_admin_can_manage_products_categories_and_users(): void
    {
        Storage::fake('public');

        $admin = $this->createUserWithRole('admin');
        $customer = $this->createUserWithRole('customer');
        $rider = $this->createUserWithRole('rider');
        $category = Category::query()->create([
            'name' => 'Merchandise',
            'slug' => 'merchandise',
            'description' => null,
            'is_active' => true,
            'sort_order' => 3,
        ]);

        $createProduct = $this
            ->withHeaders($this->authHeaderFor($admin))
            ->postJson('/api/v1/admin/products', [
                'name' => 'BrewHaus Tumbler',
                'slug' => 'brewhause-tumbler',
                'short_description' => 'Steel tumbler',
                'description' => 'Keeps coffee hot.',
                'price' => 899,
                'sale_price' => 799,
                'sku' => 'BH-TMB-001',
                'stock_quantity' => 15,
                'low_stock_threshold' => 4,
                'weight_grams' => 400,
                'category_id' => $category->id,
                'is_featured' => true,
                'is_active' => true,
                'tags' => ['gear', 'gift'],
                'primary_image_index' => 0,
                'images' => [UploadedFile::fake()->image('tumbler.jpg', 1200, 1200)],
            ]);

        $createProduct
            ->assertCreated()
            ->assertJsonPath('data.name', 'BrewHaus Tumbler')
            ->assertJsonPath('data.tags.0.name', 'gear');

        $productId = $createProduct->json('data.id');

        $this->withHeaders($this->authHeaderFor($admin))
            ->putJson('/api/v1/admin/products/'.$productId, [
                'name' => 'BrewHaus Tumbler XL',
                'slug' => 'brewhause-tumbler-xl',
                'short_description' => 'Large steel tumbler',
                'description' => 'Keeps coffee hotter for longer.',
                'price' => 999,
                'sale_price' => null,
                'sku' => 'BH-TMB-001',
                'stock_quantity' => 11,
                'low_stock_threshold' => 4,
                'weight_grams' => 450,
                'category_id' => $category->id,
                'is_featured' => false,
                'is_active' => true,
                'tags' => ['gear'],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'BrewHaus Tumbler XL')
            ->assertJsonPath('data.stock_quantity', 15);

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'stock_quantity' => 15,
        ]);

        $this->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/products?search=Tumbler')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1);

        $this->withHeaders($this->authHeaderFor($admin))
            ->postJson('/api/v1/admin/categories', [
                'name' => 'Gift Sets',
                'slug' => 'gift-sets',
                'description' => 'Curated bundles',
                'is_active' => true,
                'sort_order' => 4,
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'gift-sets');

        $giftSetId = Category::query()->where('slug', 'gift-sets')->value('id');

        $this->withHeaders($this->authHeaderFor($admin))
            ->putJson('/api/v1/admin/categories/'.$giftSetId, [
                'name' => 'Gift Sets Deluxe',
                'slug' => 'gift-sets-deluxe',
                'description' => 'Curated deluxe bundles',
                'is_active' => true,
                'sort_order' => 5,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Gift Sets Deluxe');

        $this->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/users?role=rider')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.items.0.email', $rider->email);

        $this->withHeaders($this->authHeaderFor($admin))
            ->deleteJson('/api/v1/admin/products/'.$productId)
            ->assertOk();

        $this->assertSoftDeleted(Product::class, ['id' => $productId]);
        $this->assertDatabaseHas('users', ['id' => $customer->id]);
    }

    protected function authHeaderFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->createToken('test-token')->plainTextToken,
        ];
    }

    protected function createUserWithRole(string $role): User
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole($role);

        return $user;
    }
}
