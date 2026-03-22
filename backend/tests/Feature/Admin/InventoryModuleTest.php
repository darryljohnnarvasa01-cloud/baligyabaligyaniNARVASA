<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\InventoryLog;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InventoryModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_admin_can_view_inventory_and_restock_product_inventory(): void
    {
        $admin = $this->createAdmin();
        $category = Category::query()->create([
            'name' => 'Equipment',
            'slug' => 'equipment',
            'description' => null,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'French Press',
            'slug' => 'french-press',
            'short_description' => 'Classic brewer',
            'description' => 'Classic brewer',
            'price' => 1299,
            'sale_price' => null,
            'sku' => 'BH-FP-001',
            'stock_quantity' => 2,
            'low_stock_threshold' => 4,
            'weight_grams' => 650,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $this->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/inventory')
            ->assertOk()
            ->assertJsonPath('data.0.sku', 'BH-FP-001')
            ->assertJsonPath('data.0.stock_status', 'low_stock');

        $this->withHeaders($this->authHeaderFor($admin))
            ->postJson('/api/v1/admin/inventory/'.$product->id.'/restock', [
                'quantity_to_add' => 6,
                'note' => 'Warehouse replenishment.',
            ])
            ->assertOk()
            ->assertJsonPath('data.stock_quantity', 8)
            ->assertJsonPath('data.stock_status', 'in_stock');

        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'type' => 'restock',
            'quantity_change' => 6,
            'quantity_after' => 8,
            'reference_type' => null,
        ]);
    }

    public function test_admin_can_adjust_stock_with_an_adjustment_type_and_latest_log(): void
    {
        $admin = $this->createAdmin();
        $category = Category::query()->create([
            'name' => 'Apparel',
            'slug' => 'apparel',
            'description' => null,
            'is_active' => true,
            'sort_order' => 3,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Logo Cap',
            'slug' => 'logo-cap',
            'short_description' => 'Adjustable cap',
            'description' => 'Adjustable cap',
            'price' => 699,
            'sale_price' => null,
            'sku' => 'BH-CAP-001',
            'stock_quantity' => 18,
            'low_stock_threshold' => 4,
            'weight_grams' => 150,
            'is_active' => true,
            'is_featured' => false,
        ]);

        $this->withHeaders($this->authHeaderFor($admin))
            ->postJson('/api/v1/admin/inventory/'.$product->id.'/adjust', [
                'new_quantity' => 6,
                'adjustment_type' => 'damage',
                'note' => 'Broken seals in storage.',
            ])
            ->assertOk()
            ->assertJsonPath('data.stock_quantity', 6)
            ->assertJsonCount(1, 'data.inventory_logs')
            ->assertJsonPath('data.inventory_logs.0.type', 'adjustment')
            ->assertJsonPath('data.inventory_logs.0.adjustment_type', 'damage')
            ->assertJsonPath('data.inventory_logs.0.reference_type', 'admin_adjustment')
            ->assertJsonPath('data.inventory_logs.0.quantity_change', -12);

        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'type' => 'adjustment',
            'adjustment_type' => 'damage',
            'quantity_change' => -12,
            'quantity_after' => 6,
            'reference_type' => 'admin_adjustment',
            'created_by' => $admin->id,
        ]);
    }

    public function test_admin_inventory_includes_full_log_timeline_for_each_product(): void
    {
        $admin = $this->createAdmin();
        $category = Category::query()->create([
            'name' => 'Whole Beans',
            'slug' => 'whole-beans',
            'description' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Night Bloom',
            'slug' => 'night-bloom',
            'short_description' => 'Dark roast beans',
            'description' => 'Dark roast beans',
            'price' => 499,
            'sale_price' => null,
            'sku' => 'BH-NB-001',
            'stock_quantity' => 20,
            'low_stock_threshold' => 4,
            'weight_grams' => 250,
            'is_active' => true,
            'is_featured' => false,
        ]);

        foreach (range(1, 12) as $index) {
            InventoryLog::query()->create([
                'product_id' => $product->id,
                'type' => $index % 2 === 0 ? 'restock' : 'adjustment',
                'quantity_change' => $index,
                'quantity_after' => 20 + $index,
                'reference_id' => null,
                'note' => 'Inventory event '.$index,
                'created_by' => $admin->id,
            ]);
        }

        $response = $this->withHeaders($this->authHeaderFor($admin))
            ->getJson('/api/v1/admin/inventory');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(12, 'data.0.inventory_logs')
            ->assertJsonPath('data.0.inventory_logs.0.note', 'Inventory event 12')
            ->assertJsonPath('data.0.inventory_logs.11.note', 'Inventory event 1');
    }

    protected function authHeaderFor(User $user): array
    {
        return [
            'Authorization' => 'Bearer '.$user->createToken('test-token')->plainTextToken,
        ];
    }

    protected function createAdmin(): User
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole('admin');

        return $user;
    }
}
