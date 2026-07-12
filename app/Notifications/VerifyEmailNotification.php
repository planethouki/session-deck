<?php

namespace App\Notifications;

use App\Services\EmailVerificationCodeService;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends VerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        $url = URL::temporarySignedRoute('verification.verify', Carbon::now()->addMinutes(60), [
            'id' => $notifiable->getKey(),
            'hash' => sha1($notifiable->getEmailForVerification()),
        ]);
        $code = app(EmailVerificationCodeService::class)->issue($notifiable);

        return (new MailMessage)
            ->subject('メールアドレスを確認してください')
            ->greeting($notifiable->name.' さん')
            ->line('登録を完了するには、メールアドレスの確認が必要です。')
            ->action('メールアドレスを確認する', $url)
            ->line('または、確認画面に次の6桁コードを入力してください。')
            ->line($code)
            ->line('コードは10分間、確認リンクは60分間有効です。');
    }
}
