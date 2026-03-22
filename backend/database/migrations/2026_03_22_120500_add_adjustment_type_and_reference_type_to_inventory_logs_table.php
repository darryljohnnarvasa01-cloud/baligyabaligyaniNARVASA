<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inventory_logs', function (Blueprint $table) {
            $table->enum('adjustment_type', ['count_correction', 'damage', 'manual_set', 'return_to_stock'])
                ->nullable()
                ->after('type');
            $table->string('reference_type')->nullable()->after('reference_id');
        });

        DB::table('inventory_logs')
            ->where('type', 'deduction')
            ->update(['reference_type' => 'checkout']);

        DB::table('inventory_logs')
            ->where('type', 'return')
            ->update(['reference_type' => 'return']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_logs', function (Blueprint $table) {
            $table->dropColumn(['adjustment_type', 'reference_type']);
        });
    }
};
