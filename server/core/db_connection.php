<?php
// db_connection.php

$host = 'localhost'; // Database host
$db = 'eljawad'; // Database name
$user = 'root'; // Database username
$pass = ''; // Database password

// Create a connection
$conn = new mysqli($host, $user, $pass, $db);

// Check the connection
if ($conn->connect_error) {
    // Log the connection error (this will log to the PHP default error log)
    error_log("Database connection failed: " . $conn->connect_error);
    
    // Display a generic error message to the user
    echo "An error occurred. Please try again later.";
    
    // Optionally, exit or stop further execution if needed
    exit();
}
?>
