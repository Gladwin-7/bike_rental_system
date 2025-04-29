const express = require("express");
const mysql = require("mysql2/promise"); // Using promise version for better async handling
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool for better performance
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "jheno#3001",
    database: "bike_rental_system",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection()
    .then(conn => {
        console.log("✅ Connected to MySQL database");
        conn.release();
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err);
        process.exit(1);
    });

// Helper function for queries
const query = async (sql, params) => {
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.query(sql, params);
        return results;
    } finally {
        connection.release();
    }
};

// USER LOGIN
app.post("/login", async (req, res) => {
    try {
        const { userType, identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ success: false, error: "Identifier and password are required" });
        }

        if (userType === "customer") {
            const results = await query(
                "SELECT customer_id, name, password FROM customers WHERE email = ?",
                [identifier]
            );
            
            if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
                return res.status(401).json({ success: false, error: "Invalid email or password" });
            }

            return res.json({ 
                success: true, 
                message: "Customer login successful!", 
                userType: "customer", 
                customerId: results[0].customer_id,
                customerName: results[0].name
            });

        } else if (userType === "admin") {
            const results = await query(
                "SELECT admin_id, password FROM admins WHERE username = ?",
                [identifier]
            );
            
            if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
                return res.status(401).json({ success: false, error: "Invalid username or password" });
            }

            return res.json({ 
                success: true, 
                message: "Admin login successful!", 
                userType: "admin",
                adminId: results[0].admin_id
            });

        } else {
            return res.status(400).json({ success: false, error: "Invalid user type" });
        }
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

// REGISTER
app.post("/register", async (req, res) => {
    try {
        const { name, mobile, email, address, password } = req.body;

        if (!name || !mobile || !email || !address || !password) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        // Check if user already exists
        const existingUser = await query(
            "SELECT * FROM customers WHERE mobile = ? OR email = ?", 
            [mobile, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: "Mobile number or email already registered" 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new customer
        await query(
            "INSERT INTO customers (name, mobile, email, address, password) VALUES (?, ?, ?, ?, ?)",
            [name, mobile, email, address, hashedPassword]
        );

        res.json({ success: true, message: "Registration successful. Please login." });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ success: false, error: "Registration failed" });
    }
});

// GET AVAILABLE BIKES
app.get("/get-bikes", async (req, res) => {
    try {
        const bikes = await query(
            "SELECT bike_id, registration_number, model, type, price_per_hour " +
            "FROM bikes WHERE status = 'Available'"
        );
        res.json({ success: true, data: bikes });
    } catch (err) {
        console.error("Error fetching bikes:", err);
        res.status(500).json({ success: false, error: "Failed to fetch bikes" });
    }
});

// GET ALL BIKES (Admin)
app.get("/get-all-bikes", async (req, res) => {
    try {
        const bikes = await query("SELECT * FROM bikes");
        res.json({ success: true, data: bikes });
    } catch (err) {
        console.error("Error fetching all bikes:", err);
        res.status(500).json({ success: false, error: "Failed to fetch bikes" });
    }
});

// RENT A BIKE
app.post('/rent-bike', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { customerId, bikeId, hours } = req.body;

        if (!customerId || !bikeId || !hours || hours <= 0) {
            return res.status(400).json({ success: false, error: "Invalid input data" });
        }

        // Get bike details
        const [bike] = await connection.query(
            "SELECT price_per_hour FROM bikes WHERE bike_id = ? AND status = 'Available' FOR UPDATE",
            [bikeId]
        );

        if (bike.length === 0) {
            return res.status(400).json({ success: false, error: "Bike not available" });
        }

        // Calculate rental details
        const pricePerHour = bike[0].price_per_hour;
        const totalPrice = pricePerHour * hours;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);

        // Create rental record
        await connection.query(
            "INSERT INTO rentals (customer_id, bike_id, start_datetime, end_datetime, total_price) " +
            "VALUES (?, ?, ?, ?, ?)",
            [customerId, bikeId, startDate, endDate, totalPrice]
        );

        // Update bike status
        await connection.query(
            "UPDATE bikes SET status = 'Rented' WHERE bike_id = ?",
            [bikeId]
        );

        await connection.commit();

        res.json({ 
            success: true, 
            message: "Bike rented successfully",
            rentalId: result.insertId,
            totalPrice
        });
    } catch (err) {
        await connection.rollback();
        console.error("Rent bike error:", err);
        res.status(500).json({ success: false, error: "Failed to rent bike" });
    } finally {
        connection.release();
    }
});

// RETURN A BIKE
app.post('/return-bike', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { rentalId, bikeId } = req.body;

        if (!rentalId || !bikeId) {
            return res.status(400).json({ success: false, error: "Rental ID and Bike ID are required" });
        }

        // Verify rental exists
        const [rental] = await connection.query(
            "SELECT * FROM rentals WHERE rental_id = ? AND bike_id = ?",
            [rentalId, bikeId]
        );

        if (rental.length === 0) {
            return res.status(404).json({ success: false, error: "Rental not found" });
        }

        // Delete rental record
        await connection.query(
            "DELETE FROM rentals WHERE rental_id = ?",
            [rentalId]
        );

        // Update bike status
        await connection.query(
            "UPDATE bikes SET status = 'Available' WHERE bike_id = ?",
            [bikeId]
        );

        await connection.commit();

        res.json({ success: true, message: "Bike returned successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Return bike error:", err);
        res.status(500).json({ success: false, error: "Failed to return bike" });
    } finally {
        connection.release();
    }
});

// GET CUSTOMER RENTALS
app.get("/customer-rentals/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;

        const rentals = await query(
            `SELECT r.rental_id, b.bike_id, b.model, b.type, b.registration_number, 
                    r.start_datetime, r.end_datetime, r.total_price, b.price_per_hour
             FROM rentals r
             JOIN bikes b ON r.bike_id = b.bike_id
             WHERE r.customer_id = ? AND b.status = 'Rented'`,
            [customerId]
        );

        res.json({ success: true, data: rentals });
    } catch (err) {
        console.error("Error fetching customer rentals:", err);
        res.status(500).json({ success: false, error: "Failed to fetch rentals" });
    }
});

// ADMIN: GET ALL RENTED BIKES
app.get("/rented-bikes", async (req, res) => {
    try {
        const rentals = await query(`
            SELECT r.rental_id, c.name AS customer_name, b.model, 
                   b.registration_number, b.type, r.start_datetime, 
                   r.end_datetime, r.total_price 
            FROM rentals r
            JOIN customers c ON r.customer_id = c.customer_id
            JOIN bikes b ON r.bike_id = b.bike_id
            WHERE b.status = 'Rented'
        `);
        res.json({ success: true, data: rentals });
    } catch (err) {
        console.error("Error fetching rented bikes:", err);
        res.status(500).json({ success: false, error: "Failed to fetch rentals" });
    }
});

// ADMIN: ADD BIKE
app.post("/add-bike", async (req, res) => {
    try {
        const { registration_number, model, type, price_per_hour } = req.body;

        if (!model || !type || !price_per_hour || !registration_number) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        await query(
            "INSERT INTO bikes (registration_number, model, type, price_per_hour, status) " +
            "VALUES (?, ?, ?, ?, 'Available')",
            [registration_number, model, type, price_per_hour]
        );

        res.json({ success: true, message: "Bike added successfully" });
    } catch (err) {
        console.error("Add bike error:", err);
        res.status(500).json({ success: false, error: "Failed to add bike" });
    }
});

// ADMIN: DELETE BIKE
app.delete("/delete-bike/:bikeId", async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { bikeId } = req.params;

        // Check if bike is rented
        const [rentals] = await connection.query(
            "SELECT * FROM rentals WHERE bike_id = ?",
            [bikeId]
        );

        if (rentals.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: "Cannot delete bike with active rentals" 
            });
        }

        await connection.query(
            "DELETE FROM bikes WHERE bike_id = ?",
            [bikeId]
        );

        await connection.commit();
        res.json({ success: true, message: "Bike deleted successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Error deleting bike:", err);
        res.status(500).json({ success: false, error: "Failed to delete bike" });
    } finally {
        connection.release();
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});