FROM composer:2 AS composer

FROM php:8.2.31-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libicu-dev \
        libonig-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install \
        bcmath \
        intl \
        mbstring \
        pcntl \
        pdo_mysql \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install \
    --no-interaction \
    --prefer-dist \
    --no-scripts \
    --no-progress

COPY . .
COPY docker/entrypoint.sh /usr/local/bin/laravel-entrypoint

RUN chmod +x /usr/local/bin/laravel-entrypoint \
    && composer dump-autoload --no-interaction

EXPOSE 8000

ENTRYPOINT ["laravel-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
