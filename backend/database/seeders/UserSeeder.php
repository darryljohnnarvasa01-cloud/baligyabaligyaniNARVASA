<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            [
                'role' => 'admin',
                'name' => 'Gabriel Dela Cruz',
                'email' => 'admin@brewhaus.test',
                'phone' => '09171230000',
                'avatar' => null,
                'is_active' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
            [
                'role' => 'customer',
                'name' => 'Sofia Alvarez',
                'email' => 'sofia.alvarez@brewhaus.test',
                'phone' => '09171230011',
                'avatar' => null,
                'is_active' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
            [
                'role' => 'customer',
                'name' => 'Marco Villanueva',
                'email' => 'marco.villanueva@brewhaus.test',
                'phone' => '09171230012',
                'avatar' => null,
                'is_active' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
            [
                'role' => 'customer',
                'name' => 'Lena Morales',
                'email' => 'lena.morales@brewhaus.test',
                'phone' => '09171230013',
                'avatar' => null,
                'is_active' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
            [
                'role' => 'rider',
                'name' => 'Josh Ramos',
                'email' => 'josh.ramos@brewhaus.test',
                'phone' => '09171230021',
                'avatar' => null,
                'is_active' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
            [
                'role' => 'rider',
                'name' => 'Dan Torres',
                'email' => 'dan.torres@brewhaus.test',
                'phone' => '09171230022',
                'avatar' => null,
                'is_active' => true,
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ],
        ];

        foreach ($users as $payload) {
            $user = User::query()->updateOrCreate(
                ['email' => $payload['email']],
                Arr::except($payload, ['role'])
            );

            $user->syncRoles([$payload['role']]);
        }
    }
}