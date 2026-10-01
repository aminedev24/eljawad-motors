<?php
session_start();
require_once __DIR__ . '/../../core/db_connection.php';
require_once __DIR__ . '/../../core/headers.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Staff access required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Invalid request method']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$action     = trim($data['action'] ?? '');
$vehicleRef = trim($data['vehicle_ref'] ?? '');

if (!$vehicleRef) {
    echo json_encode(['error' => 'vehicle_ref is required']);
    exit;
}

$validActions = ['reserve', 'unreserve', 'mark_sold'];
if (!in_array($action, $validActions, true)) {
    echo json_encode(['error' => 'Invalid action. Must be: ' . implode(', ', $validActions)]);
    exit;
}

// Release holds that expired before acting, so a stale 'reserved' status no
// longer blocks re-reserving a car whose hold has already lapsed.
require_once __DIR__ . '/reservation_helpers.php';
releaseExpiredReservations($conn);

// Prefix for own-stock reference numbers (ELJ-0001, ...). Must match
// STOCK_REF_PREFIX in components/admin/CarManagement.jsx. Numbering reads only
// the digits, so older ART-xxxx refs still count toward the sequence.
const STOCK_REF_PREFIX = 'ELJ-';

// Next sequential reference for own-stock vehicles.
function nextStockRef($conn) {
    $max = 0;
    $res = $conn->query("SELECT ref_no FROM cars_stock");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $num = (int)preg_replace('/\D/', '', (string)$row['ref_no']);
            if ($num > $max) $max = $num;
        }
    }
    return STOCK_REF_PREFIX . str_pad((string)($max + 1), 4, '0', STR_PAD_LEFT);
}

// Copy a partner/3rd-party feed row into cars_stock (fresh ref, status in_stock).
function insertPartnerVehicle($conn, $vehicle, $ref, $createdBy) {
    $images = $vehicle['image_urls'] ?? '';
    if (is_array($images)) {
        $images = implode(',', $images);
    } elseif (is_string($images) && str_starts_with(trim($images), '[')) {
        $decoded = json_decode($images, true);
        if (is_array($decoded)) $images = implode(',', $decoded);
    }

    $stmt = $conn->prepare(
        "INSERT INTO cars_stock
            (ref_no, make, model, price, category, color, year, engine_capacity, mileage,
             chassis_no, fuel, door, seat, transmission, drive, currency, image_urls,
             company, model_code, created_by, created_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'in_stock')"
    );
    $vMake            = $vehicle['make']            ?? '';
    $vModel           = $vehicle['model']           ?? '';
    $vPrice           = $vehicle['price']           ?? '';
    $vCategory        = $vehicle['category']        ?? '';
    $vColor           = $vehicle['color']           ?? '';
    $vYear            = $vehicle['year']            ?? '';
    $vEngineCapacity  = $vehicle['engine_capacity'] ?? '';
    $vMileage         = $vehicle['mileage']         ?? '';
    $vChassisNo       = $vehicle['chassis_no']      ?? '';
    $vFuel            = $vehicle['fuel']            ?? '';
    $vDoor            = $vehicle['door']            ?? '';
    $vSeat            = $vehicle['seat']            ?? '';
    $vTransmission    = $vehicle['transmission']    ?? '';
    $vDrive           = $vehicle['drive']           ?? '';
    $vCurrency        = $vehicle['currency']        ?? 'USD';
    $vCompany         = $vehicle['company']         ?? '';
    $vModelCode       = $vehicle['model_code']      ?? '';

    $stmt->bind_param(
        'sssssssssssssssssssi',
        $ref,
        $vMake,
        $vModel,
        $vPrice,
        $vCategory,
        $vColor,
        $vYear,
        $vEngineCapacity,
        $vMileage,
        $vChassisNo,
        $vFuel,
        $vDoor,
        $vSeat,
        $vTransmission,
        $vDrive,
        $vCurrency,
        $images,
        $vCompany,
        $vModelCode,
        $createdBy
    );
    $stmt->execute();
    return $ref;
}

$validSoldTypes = ['sold', 'sold_shipping', 'sold_by_owner', 'sold_locally'];
$saleType = trim($data['sale_type'] ?? 'sold');
if ($action === 'mark_sold' && !in_array($saleType, $validSoldTypes, true)) {
    echo json_encode(['error' => 'Invalid sale_type']);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT * FROM cars_stock WHERE ref_no = ? OR chassis_no = ? ORDER BY id DESC LIMIT 1");
    $stmt->bind_param('ss', $vehicleRef, $vehicleRef);
    $stmt->execute();
    $car = $stmt->get_result()->fetch_assoc();

    // Partner/3rd-party vehicle (not in own stock yet) — import it into
    // cars_stock with a fresh STOCK_REF_PREFIX ref (ELJ-XXXX) before applying the action.
    if (!$car && !empty($data['vehicle']) && is_array($data['vehicle'])) {
        $newRef = nextStockRef($conn);
        insertPartnerVehicle($conn, $data['vehicle'], $newRef, $_SESSION['user_id'] ?? 0);
        $stmt = $conn->prepare("SELECT * FROM cars_stock WHERE ref_no = ?");
        $stmt->bind_param('s', $newRef);
        $stmt->execute();
        $car = $stmt->get_result()->fetch_assoc();
    }

    if (!$car) {
        echo json_encode(['error' => 'Vehicle not found in inventory stock']);
        exit;
    }

    $currentStatus = $car['status'] ?? 'in_stock';
    $actualRef     = $car['ref_no'];
    $carId         = (int)$car['id'];
    $actingAdmin   = (int)($_SESSION['user_id'] ?? 0);
    $effectiveCreatedBy = ($car['created_by'] && (int)$car['created_by'] > 0)
        ? (int)$car['created_by']
        : $actingAdmin;

    if ($action === 'reserve') {
        if ($currentStatus === 'reserved') {
            echo json_encode(['error' => 'Vehicle is already reserved']);
            exit;
        }
        if ($currentStatus && str_starts_with($currentStatus, 'sold')) {
            echo json_encode(['error' => "Cannot reserve — vehicle is '{$currentStatus}'."]);
            exit;
        }

        $upStmt = $conn->prepare("UPDATE cars_stock SET status = 'reserved', created_by = COALESCE(NULLIF(created_by, 0), ?), updated_at = NOW() WHERE id = ?");
        $upStmt->bind_param('ii', $effectiveCreatedBy, $carId);
        $upStmt->execute();

        $buyerName    = trim($data['buyer_name'] ?? '');
        $buyerEmail   = trim($data['buyer_email'] ?? '');
        $buyerPhone   = trim($data['buyer_phone'] ?? '');
        $buyerCountry = trim($data['buyer_country'] ?? '');
        $durationHours = max(1, min(168, intval($data['duration_hours'] ?? 48)));

        // Link the reservation to the customer's account (looked up by email)
        // so it appears in the customer's profile. If there's no matching
        // account, leave it customer-less (user_id 0) — never the acting
        // admin's own id, or it would show up in the admin's profile.
        $reservationUserId = 0;
        if ($buyerEmail !== '') {
            $buyerStmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $buyerStmt->bind_param('s', $buyerEmail);
            $buyerStmt->execute();
            $buyerResult = $buyerStmt->get_result();
            if ($buyerResult && $buyerRow = $buyerResult->fetch_assoc()) {
                $reservationUserId = (int)$buyerRow['id'];
            }
            $buyerStmt->close();
        }

        $agreedPrice = (float)preg_replace('/[^\d\.\-]/', '', (string)($car['price'] ?? 0));
        $expiresAt   = date('Y-m-d H:i:s', time() + $durationHours * 3600);

        $insertStmt = $conn->prepare(
            "INSERT INTO reserved_vehicles
                (user_id, vehicle_ref, make, model, user_full_name, user_email, payment_plan,
                 destination_country, deposit_amount, deposit_currency, deposit_purpose,
                 agreed_price, expires_at, status)
             VALUES (?, ?, ?, ?, ?, ?, 'full', ?, 0, 'USD', ?, ?, ?, 'reserved')"
        );
        $depositPurpose = "Reservation deposit for {$car['make']} {$car['model']} (Ref: {$actualRef}) — {$durationHours}h hold";
        $insertStmt->bind_param(
            'isssssssds',
            $reservationUserId,
            $actualRef,
            $car['make'],
            $car['model'],
            $buyerName,
            $buyerEmail,
            $buyerCountry,
            $depositPurpose,
            $agreedPrice,
            $expiresAt
        );
        $insertStmt->execute();

        echo json_encode(['success' => true, 'message' => 'Vehicle reserved', 'status' => 'reserved', 'ref' => $actualRef]);

    } elseif ($action === 'unreserve') {
        if ($currentStatus !== 'reserved') {
            echo json_encode(['error' => "Cannot unreserve — vehicle status is '{$currentStatus}'. Only 'reserved' vehicles can be unreserved."]);
            exit;
        }

        $upStmt = $conn->prepare("UPDATE cars_stock SET status = 'in_stock', updated_at = NOW() WHERE id = ?");
        $upStmt->bind_param('i', $carId);
        $upStmt->execute();

        $cancelStmt = $conn->prepare(
            "UPDATE reserved_vehicles SET status = 'cancelled'
             WHERE vehicle_ref = ? AND status = 'reserved'
             ORDER BY id DESC LIMIT 1"
        );
        $cancelStmt->bind_param('s', $actualRef);
        $cancelStmt->execute();

        echo json_encode(['success' => true, 'message' => 'Reservation cancelled — vehicle available again', 'status' => 'in_stock', 'ref' => $actualRef]);

    } elseif ($action === 'mark_sold') {
        $normalizedStatus = strtolower($currentStatus ?? '');
        if (!in_array($normalizedStatus, ['reserved', 'in_stock', 'available', 'pending'], true)) {
            echo json_encode(['error' => "Cannot mark as sold — vehicle status is '{$currentStatus}'. Only 'reserved' or 'in stock' vehicles can be sold."]);
            exit;
        }

        $soldStmt = $conn->prepare("UPDATE cars_stock SET status = ?, created_by = COALESCE(NULLIF(created_by, 0), ?), updated_at = NOW() WHERE id = ?");
        $soldStmt->bind_param('sii', $saleType, $effectiveCreatedBy, $carId);
        $soldStmt->execute();

        $cancelStmt = $conn->prepare(
            "UPDATE reserved_vehicles SET status = 'cancelled'
             WHERE vehicle_ref = ? AND status = 'reserved'"
        );
        $cancelStmt->bind_param('s', $actualRef);
        $cancelStmt->execute();

        try {
            $insertStmt = $conn->prepare(
                "INSERT INTO cars_inventory
                    (ref_no, make, model, price, invoice_date, category, color, year, dimension, m3,
                     engine_capacity, mileage, chassis_no, fuel, door, seat, transmission, drive, stereo,
                     freight, final_value, discount, user_name, port_of_discharge, port_of_loading,
                     engine_type, destination, departure_port, address, phone, company, user_id, image_urls,
                     currency, size, ship_name, ship_date, arrival_port, created_by, created_at, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)"
            );
            $insertStmt->bind_param(
                'ssssssssssssssssssssssssssssssssssssssis',
                $car['ref_no'], $car['make'], $car['model'], $car['price'], $car['invoice_date'],
                $car['category'], $car['color'], $car['year'], $car['dimension'], $car['m3'],
                $car['engine_capacity'], $car['mileage'], $car['chassis_no'], $car['fuel'], $car['door'],
                $car['seat'], $car['transmission'], $car['drive'], $car['stereo'], $car['freight'],
                $car['final_value'], $car['discount'], $car['user_name'], $car['port_of_discharge'], $car['port_of_loading'],
                $car['engine_type'], $car['destination'], $car['departure_port'], $car['address'], $car['phone'],
                $car['company'], $car['user_id'], $car['image_urls'], $car['currency'], $car['size'],
                $car['ship_name'], $car['ship_date'], $car['arrival_port'], $effectiveCreatedBy, $saleType,
            );
            $insertStmt->execute();
        } catch (Exception $e) {
            error_log("[vehicle-action.php] cars_inventory insert failed (vehicle still marked sold): " . $e->getMessage());
        }

        echo json_encode(['success' => true, 'message' => 'Vehicle marked as sold', 'status' => $saleType, 'ref' => $actualRef]);
    }

} catch (\Throwable $e) {
    error_log("[vehicle-action.php] DB error: " . $e->getMessage());
    echo json_encode(['error' => 'Database error']);
}
