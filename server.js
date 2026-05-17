require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const Stripe = require("stripe");

const app = express();
const port = process.env.PORT || 4000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "src")));

// Simple SQLite DB for orders
const dbPath = path.join(__dirname, "db.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT,
            type TEXT,
            address TEXT,
            items_json TEXT,
            total REAL,
            stripe_session_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Helper to calculate total on backend
function calculateTotal(items) {
    return items.reduce((sum, item) => {
        return sum + item.price * item.qty;
    }, 0);
}

// Create Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
    try {
        const { name, phone, type, address, items } = req.body;

        if (!name || !phone || !type || !items || !items.length) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const total = calculateTotal(items);

        const lineItems = items.map(item => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.qty
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: lineItems,
            success_url: "http://localhost:4000/success.html",
            cancel_url: "http://localhost:4000/cancel.html"
        });

        db.run(
            `
            INSERT INTO orders (name, phone, type, address, items_json, total, stripe_session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
            [name, phone, type, address, JSON.stringify(items), total, session.id],
            function (err) {
                if (err) {
                    console.error(err);
                }
            }
        );

        res.json({
            sessionId: session.id,
            publicKey: process.env.STRIPE_PUBLIC_KEY
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error creating checkout session." });
    }
});

// Stripe webhook (optional but recommended for real status updates)
// You must set the endpoint in Stripe dashboard and use raw body parsing.
// For simplicity, we'll skip full webhook implementation here.

// Simple endpoints to view orders (for admin)
app.get("/orders", (req, res) => {
    db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(rows);
    });
});

// Serve static frontend (for quick local testing)
//app.use(express.static(path.join(__dirname, "..", "frontend")));

app.listen(port, () => {
    console.log('Server running on http://localhost:${port}');
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "index.html"));
});