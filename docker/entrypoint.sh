#!/bin/sh
set -e

if [ ! -f .env ]; then
    cp .env.example .env
fi

composer install --no-interaction --prefer-dist --no-progress

if ! grep -Eq '^APP_KEY=base64:.+' .env; then
    php artisan key:generate --force
fi

php artisan migrate --force

exec "$@"
