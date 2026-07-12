<?php

namespace App\Services;

use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class EmailVerificationCodeService
{
    public function issue(User $user): string
    {
        $code = (string) random_int(100000, 999999);
        EmailVerificationCode::updateOrCreate(
            ['user_id' => $user->id],
            ['code_hash' => Hash::make($code), 'expires_at' => now()->addMinutes(10), 'attempts' => 0],
        );

        return $code;
    }

    public function verify(User $user, string $code): bool
    {
        $record = EmailVerificationCode::whereBelongsTo($user)->first();
        if (! $record || $record->expires_at->isPast() || $record->attempts >= 5) {
            return false;
        }
        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');

            return false;
        }
        $user->markEmailAsVerified();
        $record->delete();

        return true;
    }
}
