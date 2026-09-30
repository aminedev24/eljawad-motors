-- Eljawad Motors database schema (structure only, no data).
-- Generated from the Artisbay production schema (yqjezvte_artisbay, Sep 2026 dump)
-- plus tables the PHP code creates lazily and the columns from
-- server/scripts/migrate_schema.php. Import into an EMPTY database.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `agreements` (
  `agreement_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `agreement_version` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `accepted_at` date NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `agreement_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`agreement_id`),
  KEY `fk_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `car_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ref_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `cars_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ref_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `make` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `model` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `price` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `category` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `year` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dimension` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `m3` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `engine_capacity` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mileage` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `chassis_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fuel` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `door` varchar(5) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seat` varchar(5) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `transmission` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `drive` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stereo` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `freight` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `final_value` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port_of_discharge` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port_of_loading` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `engine_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `destination` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `departure_port` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `image_urls` text COLLATE utf8mb4_general_ci,
  `currency` varchar(55) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `size` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ship_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ship_date` date DEFAULT NULL,
  `arrival_port` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `buying_price` double DEFAULT '0',
  `auction_fee` double DEFAULT '0',
  `transportation` double DEFAULT '0',
  `yard_fee` double DEFAULT '0',
  `photos_fee` double DEFAULT '0',
  `others_fee` double DEFAULT '0',
  `service_fee` double DEFAULT '0',
  `tax` double DEFAULT '0',
  `fob` double DEFAULT '0',
  `booking_ref` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `cars_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ref_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `make` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `model` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `price` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `category` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `year` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dimension` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `m3` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `engine_capacity` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mileage` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `chassis_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fuel` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `door` varchar(5) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seat` varchar(5) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `transmission` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `drive` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stereo` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `freight` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `final_value` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port_of_discharge` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port_of_loading` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `engine_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `destination` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `departure_port` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `company` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `image_urls` text COLLATE utf8mb4_general_ci,
  `currency` varchar(55) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `size` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ship_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ship_date` date DEFAULT NULL,
  `arrival_port` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `buying_price` double DEFAULT '0',
  `auction_fee` double DEFAULT '0',
  `transportation` double DEFAULT '0',
  `yard_fee` double DEFAULT '0',
  `photos_fee` double DEFAULT '0',
  `others_fee` double DEFAULT '0',
  `service_fee` double DEFAULT '0',
  `tax` double DEFAULT '0',
  `fob` double DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `registration_date` date NOT NULL,
  `customer_category` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `country` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `default_destination` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `person1` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `person2` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tel1` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tel2` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fax` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hp` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mobile` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `incoterm` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `auto_mail` tinyint(1) DEFAULT '0',
  `kent` tinyint(1) DEFAULT '0',
  `automet` tinyint(1) DEFAULT '0',
  `email1` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email2` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `skype` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consignee_post` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consignee_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consignee_email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consignee_rut` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notify_post` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notify_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notify_tel` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consignee_tel` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notify` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consignee` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notify_email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notify_rut` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notify_eori_no` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mya_description` text COLLATE utf8mb4_general_ci,
  `comment` text COLLATE utf8mb4_general_ci,
  `sales_staff` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pod` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `registration_source` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lead_source` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `other` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `registration_staff` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `role` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'user',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uid` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `country` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'N/A',
  `address` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `joined_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verification_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `role` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'user',
  `verification_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `verification_attempts` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `full_name` (`full_name`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `deposits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `remitter` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `country` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `consumption_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `consumption_value` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `other_user` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `amount` int NOT NULL DEFAULT '0',
  `currency` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `date` date NOT NULL,
  `leftover` int NOT NULL DEFAULT '0',
  `rate` int DEFAULT '0',
  `swift_details` text COLLATE utf8mb4_general_ci NOT NULL,
  `note` text COLLATE utf8mb4_general_ci,
  `staff` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `conversions` json DEFAULT NULL,
  `bank_fees` int NOT NULL,
  `guaranty` int NOT NULL DEFAULT '0',
  `extra_guaranty` int NOT NULL DEFAULT '0',
  `conversion_rates` text COLLATE utf8mb4_general_ci COMMENT 'JSON of rates used	',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `fk_user_name` (`user_id`),
  KEY `fk_user_name1` (`name`),
  CONSTRAINT `fk_user_name` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_user_name1` FOREIGN KEY (`name`) REFERENCES `users` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `verification_token` varchar(255) NOT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `impersonation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `user_id` int NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp NULL DEFAULT NULL,
  `impersonated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `deposit_amount` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deposit_purpose` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `vehicle_description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mileage` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `chasis_number` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `engine_capacity` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `make` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `model` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `deposit_currency` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_email2` (`email`),
  CONSTRAINT `fk_user_email2` FOREIGN KEY (`email`) REFERENCES `users` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `rates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usdToYen` decimal(8,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `soldcars` (
  `id` int NOT NULL AUTO_INCREMENT,
  `car_id` int NOT NULL,
  `car_model` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `make` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `engine_capacity` int DEFAULT NULL,
  `mileage` int DEFAULT NULL,
  `chassis_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consignee` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `price` int DEFAULT NULL,
  `currency` varchar(11) COLLATE utf8mb4_general_ci NOT NULL,
  `color` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `year` int DEFAULT NULL,
  `image_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `stock_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `size` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dimension` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `engine_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `model_code` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `destination` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seats` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fuel` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `doors` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `departure_port` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port_of_loading` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `port_of_discharge` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `soldcars_ibfk_1` (`user_id`),
  KEY `soldcars_ibfk_2` (`consignee`),
  CONSTRAINT `soldcars_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `soldcars_chk_1` CHECK (json_valid(`image_urls`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `submitted_inquiries` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `country` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `tel` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `port` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `make` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `model` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `year_from` int NOT NULL,
  `year_to` int NOT NULL,
  `price_from` decimal(10,2) NOT NULL,
  `price_to` decimal(10,2) NOT NULL,
  `body_type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `mileage_from` int NOT NULL,
  `mileage_to` int NOT NULL,
  `transmission` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `steering` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_user_name2` (`name`),
  CONSTRAINT `fk_user_name2` FOREIGN KEY (`name`) REFERENCES `users` (`full_name`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `submittedtireorders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `make` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `width` int NOT NULL,
  `aspect_ratio` int DEFAULT NULL,
  `rim_diameter` int NOT NULL,
  `quantity` int NOT NULL,
  `speed_rating` varchar(255) DEFAULT NULL,
  `load_index` int DEFAULT NULL,
  `order_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tireorders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `make` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `width` int NOT NULL,
  `aspect_ratio` int DEFAULT NULL,
  `rim_diameter` int NOT NULL,
  `quantity` int NOT NULL,
  `speed_rating` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `load_index` int DEFAULT NULL,
  `order_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `uid` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` int NOT NULL,
  `is_logged_in` tinyint(1) NOT NULL DEFAULT '1',
  `last_login` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Created lazily by server/reservations/create_reservation.php (fetchStock.php joins it).
CREATE TABLE IF NOT EXISTS reserved_vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vehicle_ref VARCHAR(255) NOT NULL,
  make VARCHAR(100) DEFAULT NULL,
  model VARCHAR(100) DEFAULT NULL,
  user_full_name VARCHAR(255) DEFAULT NULL,
  user_email VARCHAR(255) DEFAULT NULL,
  payment_plan VARCHAR(50) NOT NULL,
  destination_country VARCHAR(100) DEFAULT NULL,
  port VARCHAR(100) DEFAULT NULL,
  delivery VARCHAR(255) DEFAULT NULL,
  inspection_required TINYINT(1) DEFAULT 0,
  deposit_amount DECIMAL(15,2) DEFAULT 0,
  deposit_currency VARCHAR(10) DEFAULT NULL,
  deposit_purpose VARCHAR(255) DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'reserved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Added lazily by fetchMyReservations.php; expiry checks in fetchStock.php,
  -- fetchVehicle.php and reservation_helpers.php read expires_at.
  agreed_price DECIMAL(15,2) DEFAULT 0,
  expires_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Created lazily by server/auth/addFavorite.php.
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ref_no VARCHAR(255) NOT NULL,
  make VARCHAR(100) DEFAULT NULL,
  model VARCHAR(100) DEFAULT NULL,
  year VARCHAR(20) DEFAULT NULL,
  price DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  image VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorite (user_id, ref_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Created lazily by server/inquiries/submitVehicleInquiry.php.
CREATE TABLE IF NOT EXISTS vehicle_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_ref VARCHAR(255) DEFAULT NULL,
  vehicle_name VARCHAR(255) DEFAULT NULL,
  vehicle_status VARCHAR(50) DEFAULT NULL,
  vehicle_details TEXT DEFAULT NULL,
  page_url VARCHAR(500) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Columns from server/scripts/migrate_schema.php (not yet in the source schema).
ALTER TABLE `cars_stock`
  ADD COLUMN `model_code` varchar(50) DEFAULT NULL,
  ADD COLUMN `created_by` int(11) DEFAULT NULL,
  ADD COLUMN `steering` varchar(50) DEFAULT NULL,
  ADD COLUMN `options` text DEFAULT NULL,
  ADD COLUMN `popularity` int(11) DEFAULT 0,
  ADD COLUMN `created_at` datetime DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `cars_inventory`
  ADD COLUMN `created_by` int(11) DEFAULT NULL,
  ADD COLUMN `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `steering` varchar(50) DEFAULT NULL,
  ADD COLUMN `model_code` varchar(50) DEFAULT NULL,
  ADD COLUMN `options` text DEFAULT NULL;

ALTER TABLE `invoices`
  ADD COLUMN `vehicle_ref` varchar(255) DEFAULT NULL;

SET FOREIGN_KEY_CHECKS = 1;
