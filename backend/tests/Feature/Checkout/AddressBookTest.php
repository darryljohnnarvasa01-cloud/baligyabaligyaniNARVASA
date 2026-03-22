<?php

namespace Tests\Feature\Checkout;

use App\Models\Address;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AddressBookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'sanctum');
        Role::findOrCreate('customer', 'sanctum');
        Role::findOrCreate('rider', 'sanctum');
    }

    public function test_customer_can_manage_their_address_book(): void
    {
        $customer = $this->createCustomer();

        $storeResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->postJson('/api/v1/addresses', [
                'label' => 'Home',
                'recipient_name' => 'Sofia Alvarez',
                'phone' => '09171234567',
                'street' => '12 Roast St',
                'barangay' => 'Poblacion',
                'city' => 'Davao City',
                'province' => 'Davao del Sur',
                'zip_code' => '8000',
                'is_default' => true,
            ]);

        $storeResponse
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.label', 'Home')
            ->assertJsonPath('data.is_default', true);

        $addressId = (int) $storeResponse->json('data.id');

        $updateResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->putJson('/api/v1/addresses/'.$addressId, [
                'label' => 'Office',
                'recipient_name' => 'Sofia Alvarez',
                'phone' => '09179998888',
                'street' => '99 Espresso Ave',
                'barangay' => 'Matina',
                'city' => 'Davao City',
                'province' => 'Davao del Sur',
                'zip_code' => '8000',
                'is_default' => false,
            ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.label', 'Office')
            ->assertJsonPath('data.phone', '09179998888');

        $secondAddress = Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Studio',
            'recipient_name' => 'Sofia Alvarez',
            'phone' => '09176667777',
            'street' => '5 Bean Lane',
            'barangay' => 'Buhangin',
            'city' => 'Davao City',
            'province' => 'Davao del Norte',
            'zip_code' => '8000',
            'is_default' => false,
        ]);

        $defaultResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->patchJson('/api/v1/addresses/'.$secondAddress->id.'/default');

        $defaultResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $secondAddress->id)
            ->assertJsonPath('data.is_default', true);

        $indexResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->getJson('/api/v1/addresses');

        $indexResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');

        $deleteResponse = $this
            ->withHeaders($this->authHeaderFor($customer))
            ->deleteJson('/api/v1/addresses/'.$addressId);

        $deleteResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Address deleted successfully.');

        $this->assertDatabaseMissing('addresses', [
            'id' => $addressId,
        ]);

        $this->assertDatabaseHas('addresses', [
            'id' => $secondAddress->id,
            'is_default' => true,
        ]);
    }

    protected function authHeaderFor(User $user): array
    {
        $token = $user->createToken('address-token')->plainTextToken;

        return [
            'Authorization' => 'Bearer '.$token,
        ];
    }

    protected function createCustomer(): User
    {
        $user = User::factory()->create([
            'email' => 'address'.uniqid().'@example.com',
            'password' => 'password123',
        ]);
        $user->assignRole('customer');

        return $user;
    }
}
