<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailVerificationCodeService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailVerificationController extends Controller
{
    public function notice()
    {
        return Inertia::render('Auth/VerifyEmail');
    }

    public function verify(EmailVerificationRequest $request)
    {
        if ($request->user()->markEmailAsVerified()) {
            event(new Verified($request->user()));
        }

        return redirect()->route('dashboard')->with('success', 'メールアドレスを確認しました。');
    }

    public function verifyCode(Request $request, EmailVerificationCodeService $service)
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        if (! $service->verify($request->user(), $data['code'])) {
            return back()->withErrors(['code' => 'コードが正しくないか、有効期限が切れています。']);
        }
        event(new Verified($request->user()));

        return redirect()->route('dashboard')->with('success', 'メールアドレスを確認しました。');
    }

    public function resend(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->route('dashboard');
        }
        $request->user()->sendEmailVerificationNotification();

        return back()->with('status', 'verification-link-sent');
    }
}
