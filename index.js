// --- File: index.js (Backend) ---

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
// const bcrypt = require('bcryptjs'); // Direkomendasikan untuk hashing password, install dengan `npm install bcryptjs`

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Database SQLite
const db = new sqlite3.Database('./gym_finder.db', (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.serialize(() => {
      // Skema tabel dengan penambahan latitude dan longitude
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
        location TEXT,
        latitude REAL,
        longitude REAL
      )`);
      
      // Seeding Data dengan Koordinat
      db.get("SELECT COUNT(*) as count FROM gyms", (err, row) => {
        if (err) {
            console.error("Error checking gyms table:", err.message);
            return;
        }
        if (row && row.count === 0) {
          console.log("Database is empty, seeding initial data with coordinates...");
          
          const locationsToSeed = ['Sidoarjo', 'Surabaya', 'Malang'];
          const gymsToSeed = [
            // Sidoarjo (Pusat: -7.44, 112.71)
            { nama: 'Fitness First Sidoarjo', location: 'Sidoarjo', lat: -7.4451, lon: 112.7153 },
            { nama: 'Gold\'s Gym Sidoarjo', location: 'Sidoarjo', lat: -7.4389, lon: 112.7201 },
            { nama: 'One GOR Sidoarjo', location: 'Sidoarjo', lat: -7.4478, lon: 112.7183 },
            { nama: 'Deltasari Sport Center', location: 'Sidoarjo', lat: -7.3691, lon: 112.7405 },
            { nama: 'Planet Fitness Pondok Tjandra', location: 'Sidoarjo', lat: -7.3482, lon: 112.7663 },

            // Surabaya (Pusat: -7.25, 112.75)
            { nama: 'Atlas Sports Club', location: 'Surabaya', lat: -7.2798, lon: 112.7565 },
            { nama: 'Urban Athletes', location: 'Surabaya', lat: -7.2885, lon: 112.7382 },
            { nama: 'Celebrity Fitness Galaxy Mall', location: 'Surabaya', lat: -7.2759, lon: 112.7845 },
            { nama: 'Gold\'s Gym Grand City Mall', location: 'Surabaya', lat: -7.2581, lon: 112.7519 },
            { nama: 'Fitness First Tunjungan Plaza', location: 'Surabaya', lat: -7.2612, lon: 112.7408 },

            // Malang (Pusat: -7.98, 112.62)
            { nama: 'Malang Fitness Center', location: 'Malang', lat: -7.9754, lon: 112.6231 },
            { nama: 'Universitas Brawijaya Sport Center', location: 'Malang', lat: -7.9536, lon: 112.6146 },
            { nama: 'MX Mall Fitness', location: 'Malang', lat: -7.9667, lon: 112.6171 },
            { nama: 'Ijen Fitness Corner', location: 'Malang', lat: -7.9722, lon: 112.6205 },
            { nama: 'Soehat Gym Center', location: 'Malang', lat: -7.9497, lon: 112.6158 },
          ];

          const locationStmt = db.prepare("INSERT INTO locations (name) VALUES (?)");
          locationsToSeed.forEach(loc => locationStmt.run(loc));
          locationStmt.finalize();

          const gymStmt = db.prepare("INSERT INTO gyms (nama, location, latitude, longitude) VALUES (?, ?, ?, ?)");
          gymsToSeed.forEach(gym => gymStmt.run(gym.nama, gym.location, gym.lat, gym.lon));
          gymStmt.finalize();
          
          console.log("Seeding complete.");
        } else {
          console.log("Database already contains data, skipping seed.");
        }
      });
    });
  }
});


// =================================
// SERVICE: AUTHENTICATION (KODE DIPULIHKAN)
// =================================

// Endpoint untuk registrasi user baru
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // PENTING: Dalam aplikasi production, Anda WAJIB melakukan hashing pada password.
  // Contoh dengan bcrypt:
  // const salt = bcrypt.genSaltSync(10);
  // const hashedPassword = bcrypt.hashSync(password, salt);
  // const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
  // db.run(sql, [username, hashedPassword], function(err) { ... });

  const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
  db.run(sql, [username, password], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: "User registered successfully", userId: this.lastID });
  });
});

// Endpoint untuk login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const sql = "SELECT * FROM users WHERE username = ?";
  db.get(sql, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: "Invalid username or password" });
    }

    // PENTING: Bandingkan password yang di-hash, bukan plain text.
    // Contoh dengan bcrypt:
    // const isMatch = bcrypt.compareSync(password, user.password);
    // if (!isMatch) {
    //   return res.status(401).json({ error: "Invalid username or password" });
    // }
    
    // Perbandingan password plain text (tidak aman, hanya untuk contoh)
    if (user.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
    }

    // Buat token sederhana (dalam aplikasi nyata, gunakan JWT)
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
    const updateSql = "UPDATE users SET token = ? WHERE id = ?";
    
    db.run(updateSql, [token, user.id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      res.json({ message: "Login successful", token: token });
    });
  });
});


// =================================
// SERVICE: LOCATION (Tetap sama)
// =================================
app.get('/api/location', (req, res) => {
  const sql = "SELECT id, name FROM locations";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// =================================
// SERVICE: GYM (Diperbarui untuk menyertakan koordinat)
// =================================

// GET /api/gym (Diperbarui)
app.get('/api/gym', (req, res) => {
  const sql = "SELECT id, nama, location, latitude, longitude FROM gyms";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/gym/search/:location (Diperbarui)
app.get('/api/gym/search/:location', (req, res) => {
  const { location } = req.params;
  const sql = "SELECT id, nama, location, latitude, longitude FROM gyms WHERE location = ?";
  db.all(sql, [location], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/gym/:id (Diperbarui)
app.get('/api/gym/:id', (req, res) => {
  if (isNaN(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
  }
  const { id } = req.params;
  const sql = "SELECT id, nama, location, latitude, longitude FROM gyms WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Gym not found" });
    res.json(row);
  });
});

// POST /api/gym (Diperbarui untuk menerima koordinat)
app.post('/api/gym', (req, res) => {
  // Diasumsikan ada middleware untuk verifikasi token
  const { name, location, latitude, longitude } = req.body;
  if (!name || !location || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Name, location, latitude, and longitude are required" });
  }
  const sql = "INSERT INTO gyms (nama, location, latitude, longitude) VALUES (?, ?, ?, ?)";
  db.run(sql, [name, location, latitude, longitude], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, nama: name, location: location, latitude, longitude });
  });
});


// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});