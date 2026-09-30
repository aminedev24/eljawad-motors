<?php

// reservation_helpers.php — shared helpers for reservation expiry handling.
// Requires a mysqli connection ($conn) from db_connection.php to be available
// in the calling script. No output is emitted.

// Cancel holds whose expiry has passed so they stop counting as active
// anywhere (public badge, customer profile, reservations list, reserve guard).
// The vehicle's own cars_stock.status is intentionally left untouched — the
// sales team decides whether the car is sellable again, not this cleanup.
function releaseExpiredReservations($conn) {
    $expired = $conn->prepare(
        "UPDATE reserved_vehicles
            SET status = 'cancelled'
          WHERE status IN ('reserved','pending_payment')
            AND expires_at IS NOT NULL AND expires_at <= NOW()"
    );
    if ($expired === false) {
        // e.g. expires_at missing on an older table - skip the cleanup rather
        // than fataling every page that calls this.
        error_log('releaseExpiredReservations: ' . $conn->error);
        return;
    }
    $expired->execute();
    $expired->close();
}
