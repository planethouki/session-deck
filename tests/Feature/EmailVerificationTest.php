<?php

namespace Tests\Feature;

use App\Models\EmailVerificationCode;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use App\Services\EmailVerificationCodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_can_be_verified_with_signed_url(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->actingAs($user)->get($url)->assertRedirect(route('dashboard'));
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_email_can_be_verified_with_six_digit_code(): void
    {
        $user = User::factory()->unverified()->create();
        $code = app(EmailVerificationCodeService::class)->issue($user);
        $this->actingAs($user)->post('/verify-email/code', ['code' => $code])->assertRedirect(route('dashboard'));
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->assertDatabaseMissing('email_verification_codes', ['user_id' => $user->id]);
    }

    public function test_invalid_code_increments_attempt_count(): void
    {
        $user = User::factory()->unverified()->create();
        app(EmailVerificationCodeService::class)->issue($user);
        $this->actingAs($user)->post('/verify-email/code', ['code' => '000000'])->assertSessionHasErrors('code');
        $this->assertSame(1, EmailVerificationCode::whereBelongsTo($user)->value('attempts'));
    }

    public function test_verification_email_can_be_resent(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        $this->actingAs($user)->post('/email/verification-notification')->assertSessionHas('status', 'verification-link-sent');
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }
}
