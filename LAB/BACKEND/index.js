const express = require('express');
const cors = require('cors'); // Import cors

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(cors()); 
const dbPath = path.join(__dirname, "database.db");
let db = null;
const SECRET_KEY = "your_secret_key";  

app.use(express.json());

const initializeAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });

        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `);

        console.log("Connected to the SQLite database.");
        app.listen(3000, () => {
            console.log("Server running at http://localhost:3000/");
        });
    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializeAndServer();

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword]);

        res.json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid email or password!' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ message: 'Login successful!', token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};


app.get('/profile', authenticateToken, async (req, res) => {
    const user = await db.get(`SELECT id, name, email FROM users WHERE id = ?`, [req.user.id]);
    res.json(user);
});
