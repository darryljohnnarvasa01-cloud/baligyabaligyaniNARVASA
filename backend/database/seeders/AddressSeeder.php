<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AddressSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $addressBook = [
            'sofia.alvarez@brewhaus.test' => [
                [
                    'label' => 'Home',
                    'recipient_name' => 'Sofia Alvarez',
                    'phone' => '09171230011',
                    'street' => 'Lot 12 Durian Street',
                    'barangay' => 'Catalunan Grande',
                    'city' => 'Davao City',
                    'province' => 'Davao del Sur',
                    'zip_code' => '8000',
                    'is_default' => true,
                ],
                [
                    'label' => 'Office',
                    'recipient_name' => 'Sofia Alvarez',
                    'phone' => '09171230011',
                    'street' => '2F Acacia Hub, Quimpo Boulevard',
                    'barangay' => 'Matina Aplaya',
                    'city' => 'Davao City',
                    'province' => 'Davao del Sur',
                    'zip_code' => '8000',
                    'is_default' => false,
                ],
            ],
            'marco.villanueva@brewhaus.test' => [
                [
                    'label' => 'Home',
                    'recipient_name' => 'Marco Villanueva',
                    'phone' => '09171230012',
                    'street' => '45 Waling-Waling Street',
                    'barangay' => 'Sasa',
                    'city' => 'Davao City',
                    'province' => 'Davao del Sur',
                    'zip_code' => '8000',
                    'is_default' => true,
                ],
                [
                    'label' => 'Office',
                    'recipient_name' => 'Marco Villanueva',
                    'phone' => '09171230012',
                    'street' => '3F One Bajada Suites',
                    'barangay' => 'Bajada',
                    'city' => 'Davao City',
                    'province' => 'Davao del Sur',
                    'zip_code' => '8000',
                    'is_default' => false,
                ],
            ],
            'lena.morales@brewhaus.test' => [
                [
                    'label' => 'Home',
                    'recipient_name' => 'Lena Morales',
                    'phone' => '09171230013',
                    'street' => '18 Narra Lane',
                    'barangay' => 'Buhangin Proper',
                    'city' => 'Davao City',
                    'province' => 'Davao del Sur',
                    'zip_code' => '8000',
                    'is_default' => true,
                ],
                [
                    'label' => 'Studio',
                    'recipient_name' => 'Lena Morales',
                    'phone' => '09171230013',
                    'street' => 'Poblacion Market Central',
                    'barangay' => 'Poblacion District',
                    'city' => 'Davao City',
                    'province' => 'Davao del Sur',
                    'zip_code' => '8000',
                    'is_default' => false,
                ],
            ],
        ];

        DB::transaction(function () use ($addressBook) {
            foreach ($addressBook as $email => $addresses) {
                $user = User::query()->where('email', $email)->firstOrFail();

                foreach ($addresses as $payload) {
                    Address::query()->updateOrCreate(
                        [
                            'user_id' => $user->id,
                            'label' => $payload['label'],
                        ],
                        $payload + ['user_id' => $user->id]
                    );
                }
            }
        });
    }
}