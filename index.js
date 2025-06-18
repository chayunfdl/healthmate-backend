const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Mengizinkan Cross-Origin Resource Sharing
app.use(express.json()); // Mem-parsing body request JSON

// Setup Database SQLite
// Membuat atau menghubungkan ke file database gym_finder.db
const db = new sqlite3.Database('./gym_finder.db', (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    // Membuat tabel jika belum ada
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        token TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS gyms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT,
        location TEXT
      )`);
    });
  }
});

// Helper function untuk otentikasi token (sangat sederhana)
const authenticateToken = (token, callback) => {
  if (!token) {
    return callback(new Error("Token is required"), null);
  }
  const sql = "SELECT * FROM users WHERE token = ?";
  db.get(sql, [token], (err, user) => {
    if (err) {
      return callback(err, null);
    }
    if (!user) {
      return callback(new Error("Invalid token"), null);
    }
    callback(null, user); // Sukses
  });
};

// =================================
// SERVICE: AUTH
// =================================

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // Token sederhana (di dunia nyata, gunakan JWT)
  const token = 'token-' + Math.random().toString(36).substring(2, 15);

  const sql = "INSERT INTO users (username, password, token) VALUES (?, ?, ?)";
  db.run(sql, [username, password, token], function(err) {
    if (err) {
      return res.status(400).json({ error: "Username already exists." });
    }
    res.status(201).json({ token: token });
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const sql = "SELECT token FROM users WHERE username = ? AND password = ?";
  db.get(sql, [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ token: row.token });
  });
});


// =================================
// SERVICE: LOCATION
// =================================

// GET /api/location
app.get('/api/location', (req, res) => {
  const sql = "SELECT id, name FROM locations";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/location/:id
app.get('/api/location/:id', (req, res) => {
  const { id } = req.params;
  const sql = "SELECT id, name FROM locations WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json(row);
  });
});

// POST /api/location
app.post('/api/location', (req, res) => {
  const { token, name } = req.body;

  authenticateToken(token, (err, user) => {
    if (err) {
      return res.status(403).json({ error: err.message });
    }

    if (!name) {
      return res.status(400).json({ error: "Location name is required" });
    }

    const sql = "INSERT INTO locations (name) VALUES (?)";
    db.run(sql, [name], function(err) {
      if (err) {
        return res.status(400).json({ error: "Location name already exists" });
      }
      res.status(201).json({ id: this.lastID, name: name });
    });
  });
});

// =================================
// SERVICE: GYM
// =================================

// GET /api/gym
app.get('/api/gym', (req, res) => {
  const sql = "SELECT id, nama, location FROM gyms";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/gym/:location (Mencari berdasarkan string lokasi)
app.get('/api/gym/search/:location', (req, res) => {
  const { location } = req.params;
  const sql = "SELECT id, nama, location FROM gyms WHERE location = ?";
  db.all(sql, [location], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/gym/:id (Mencari berdasarkan ID numerik)
app.get('/api/gym/:id', (req, res) => {
  // Pastikan ID adalah angka untuk membedakan dari rute /search/:location
  if (isNaN(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format. Use /api/gym/search/<location_name> for searching by location.' });
  }

  const { id } = req.params;
  const sql = "SELECT id, nama, location FROM gyms WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Gym not found" });
    }
    res.json(row);
  });
});

// POST /api/gym
app.post('/api/gym', (req, res) => {
  const { token, name, location } = req.body;

  authenticateToken(token, (err, user) => {
    if (err) {
      return res.status(403).json({ error: err.message });
    }

    if (!name || !location) {
      return res.status(400).json({ error: "Gym name and location are required" });
    }

    const sql = "INSERT INTO gyms (nama, location) VALUES (?, ?)";
    db.run(sql, [name, location], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, nama: name, location: location });
    });
  });
});

// POST /api/gym/:location
app.post('/api/gym/:location', (req, res) => {
  const { location } = req.params;
  const { token, name } = req.body;

  authenticateToken(token, (err, user) => {
    if (err) {
      return res.status(403).json({ error: err.message });
    }

    if (!name) {
      return res.status(400).json({ error: "Gym name is required" });
    }

    const sql = "INSERT INTO gyms (nama, location) VALUES (?, ?)";
    db.run(sql, [name, location], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, nama: name, location: location });
    });
  });
});


// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});