<?php
declare(strict_types=1);

$faviconPath = dirname(__DIR__) . '/public/favicon.svg';

if (!is_file($faviconPath)) {
    http_response_code(404);
    exit;
}

header('Content-Type: image/svg+xml; charset=utf-8');
header('Cache-Control: public, max-age=86400');
readfile($faviconPath);
