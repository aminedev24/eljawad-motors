<?php
session_set_cookie_params([
    'lifetime' => 42000,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

require_once __DIR__ . '/../core/headers.php';
require_once __DIR__ . '/../core/csrf.php';
require_once __DIR__ . '/../core/stock_access.php';

// Issue/refresh CSRF token so the frontend always has a valid one
$csrfToken = csrf_set_token();

if (isset($_SESSION['user_id'])) {
    // Only logged-in users need the database (for their stock access tier);
    // a logged-out page load must not depend on it.
    require_once __DIR__ . '/../core/db_connection.php';
    $isImpersonating = isset($_SESSION['impersonator']);

    echo json_encode([
        "status"  => "success",
        "message" => "User is logged in.",
        "csrf"    => $csrfToken,
        "user"    => [
            "id"              => $_SESSION['user_id'],
            "name"            => $_SESSION['full_name'],
            "email"           => $_SESSION['email'],
            "uid"             => $_SESSION['uid'],
            "role"            => $_SESSION['role'],
            "stock_access"    => stock_access_level($conn),
            "isImpersonating" => $isImpersonating,
            "impersonator"    => $isImpersonating ? $_SESSION['impersonator'] : null,
        ],
    ]);
} else {
    // Clear any stale user data but keep the session alive so the CSRF token persists
    unset(
        $_SESSION['user_id'],
        $_SESSION['full_name'],
        $_SESSION['uid'],
        $_SESSION['email'],
        $_SESSION['role'],
        $_SESSION['auth_source'],
        $_SESSION['admin_verified'],
        $_SESSION['impersonator']
    );

    echo json_encode([
        "status"  => "error",
        "message" => "User not logged in.",
        "csrf"    => $csrfToken,
    ]);
}
?>
