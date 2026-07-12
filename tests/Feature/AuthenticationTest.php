<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_is_sent_to_verification_notice(): void
    {
        Notification::fake();
        $response = $this->post('/register', [
            'name' => 'New User', 'email' => 'new@example.com',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ]);
        $response->assertRedirect(route('verification.notice'));
        $this->assertAuthenticated();
        $this->assertNull(User::whereEmail('new@example.com')->first()->email_verified_at);
    }

    public function test_active_user_can_login_and_session_is_regenerated(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret123')]);
        $oldSession = session()->getId();
        $this->post('/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($user);
        $this->assertNotSame($oldSession, session()->getId());
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret123'), 'is_active' => false]);
        $this->post('/login', ['email' => $user->email, 'password' => 'secret123'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_user_can_logout(): void
    {
        $this->actingAs(User::factory()->create())->post('/logout')->assertRedirect('/');
        $this->assertGuest();
    }

    public function test_unverified_user_cannot_open_dashboard(): void
    {
        $this->actingAs(User::factory()->unverified()->create())->get('/dashboard')->assertRedirect(route('verification.notice'));
    }
}
