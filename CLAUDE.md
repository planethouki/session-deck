# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

The project runs entirely in Docker Compose. Start everything with:

```bash
docker compose up --build
```

On first run the entrypoint script automatically copies `.env.example` → `.env`, installs Composer dependencies, generates `APP_KEY`, and runs migrations. The Vite container handles `npm install` on its own.

- Laravel app: http://localhost:8000
- Vite dev server: http://localhost:5173
- MySQL: internal `db:3306` (database: `laravel`, user: `laravel`, password: `password`)

Stop without removing data: `docker compose down`. Remove DB volume too: `docker compose down -v`.

## Common Commands

Run these inside the `app` container (`docker compose exec app <cmd>`) or via a shell (`docker compose exec app sh`):

```bash
# PHP / Laravel
php artisan migrate
php artisan make:model Foo -mrc   # model + migration + resource controller
php artisan route:list

# Tests (SQLite in-memory, no DB container needed)
php artisan test                  # all tests
php artisan test tests/Unit/ExampleTest.php   # single file
./vendor/bin/phpunit --filter MethodName      # single test method

# Composer
composer install
composer require <package>
```

Run these in the `vite` container or locally (Node 24 via Volta):

```bash
npm run dev    # Vite dev server (already started by Docker Compose)
npm run build  # production build
```

## Architecture

**Stack:** Laravel 12 (PHP 8.2) + Inertia.js v2 + React 19 + TypeScript + Tailwind CSS v4 + Vite 7.

**Request flow:**
1. Every HTTP request hits Laravel routing (`routes/web.php`).
2. Routes return `Inertia::render('PageName', $props)` instead of Blade views.
3. Inertia serialises `$props` as JSON and passes them to the matching React component.
4. The single Blade shell (`resources/views/app.blade.php`) bootstraps the SPA; subsequent navigations are handled client-side by Inertia without full page reloads.

**Frontend pages** live in `resources/js/Pages/` and are resolved by name (e.g., `'Home'` → `Pages/Home.tsx`). Page components receive server-provided props as typed React props.

**Global prop types** are declared in `resources/js/types/global.d.ts` by augmenting the `@inertiajs/core` `PageProps` interface — add shared props (e.g., `auth`, `flash`) there so they appear on every page automatically.

**Styling:** Tailwind CSS v4 is configured via the Vite plugin (`@tailwindcss/vite`); there is no `tailwind.config.js`. CSS entry point is `resources/css/app.css`.

**Tests** use SQLite `:memory:` (see `phpunit.xml`) so they run independently of MySQL.
