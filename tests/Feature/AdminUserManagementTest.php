<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_user_cannot_access_admin_pages(): void
    {
        $this->actingAs(User::factory()->create())->get('/admin/users')->assertForbidden();
    }

    public function test_admin_can_access_and_update_a_user(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $this->actingAs($admin)->get('/admin/users')->assertOk();
        $this->patch("/admin/users/{$user->id}", ['role' => 'admin', 'is_active' => true])->assertSessionHasNoErrors();
        $this->assertTrue($user->fresh()->isAdmin());
    }

    public function test_admin_cannot_demote_or_disable_self(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->patch("/admin/users/{$admin->id}", ['role' => 'user', 'is_active' => false])->assertSessionHasErrors('role');
        $this->assertTrue($admin->fresh()->isAdmin());
        $this->assertTrue($admin->fresh()->is_active);
    }
}
