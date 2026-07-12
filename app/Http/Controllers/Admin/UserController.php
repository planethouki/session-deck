<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search'));
        $users = User::query()
            ->when($search, fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")))
            ->latest()->paginate(15)->withQueryString();

        return Inertia::render('Admin/Users/Index', ['users' => $users, 'filters' => ['search' => $search]]);
    }

    public function show(User $user)
    {
        return Inertia::render('Admin/Users/Show', ['managedUser' => $user]);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'role' => ['required', Rule::enum(UserRole::class)],
            'is_active' => ['required', 'boolean'],
        ]);
        if ($request->user()->is($user) && ($data['role'] !== UserRole::Admin->value || ! $data['is_active'])) {
            return back()->withErrors(['role' => '自分自身の管理者権限を解除したり、アカウントを停止したりできません。']);
        }
        $user->update($data);

        return back()->with('success', 'ユーザー情報を更新しました。');
    }
}
