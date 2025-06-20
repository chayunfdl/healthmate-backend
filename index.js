// --- File: index.js (Backend dengan Penyimpanan Persisten di Render) ---

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path'); // Mengimpor modul 'path'
const fs = require('fs');     // Mengimpor modul 'file system'

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- PERBAIKAN: PATH DATABASE UNTUK PENYIMPANAN PERSISTEN DI RENDER ---
const dataDir = '/var/data';
const dbPath = path.join(dataDir, 'gym_finder.db');

// Pastikan direktori penyimpanan ada
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created persistent data directory at: ${dataDir}`);
}

// Gunakan dbPath untuk membuat koneksi database yang persisten
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening persistent database", err.message);
  } else {
    console.log("Connected to the persistent SQLite database at:", dbPath);
    
    db.serialize(() => {
      // Skema tabel (tidak berubah)
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
      
      // Seeding Data (hanya berjalan jika tabel gyms kosong)
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
// SERVICE: AUTHENTICATION (Sudah dirapikan)
// =================================
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
  db.run(sql, [username, password], function(err) {
    if (err) {
      if (err.errno === 19) {
        return res.status(409).json({ error: "Username already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, username: username });
  });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isMatch = (password === user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        const token = 'token-' + user.username + '-' + Date.now();
        const updateSql = "UPDATE users SET token = ? WHERE id = ?";
        db.run(updateSql, [token, user.id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            res.json({ message: "Login successful", token: token });
        });
    });
});

// =================================
// SERVICE: LOCATION (Tidak berubah)
// =================================
app.get('/api/location', (req, res) => {
  const sql = "SELECT id, name FROM locations";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


// =================================
// SERVICE: GYM (Tidak berubah)
// =================================
const addGmapsUrl = (gym) => {
    if (!gym || gym.latitude == null || gym.longitude == null) return gym;
    return {
      ...gym,
      gmaps_url: `https://www.google.com/maps/search/?api=1&query=${gym.latitude},${gym.longitude}`
    };
};

app.get('/api/gym', (req, res) => {
  const sql = "SELECT id, nama, location, latitude, longitude FROM gyms";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const validGyms = rows.filter(gym => gym.latitude != null && gym.longitude != null);
    const gymsWithGmaps = validGyms.map(addGmapsUrl);
    res.json(gymsWithGmaps);
  });
});

app.get('/api/gym/search/:location', (req, res) => {
  const { location } = req.params;
  const sql = "SELECT id, nama, location, latitude, longitude FROM gyms WHERE location = ?";
  db.all(sql, [location], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const validGyms = rows.filter(gym => gym.latitude != null && gym.longitude != null);
    const gymsWithGmaps = validGyms.map(addGmapsUrl);
    res.json(gymsWithGmaps);
  });
});

app.get('/api/gym/:id', (req, res) => {
  if (isNaN(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
  }
  const { id } = req.params;
  const sql = "SELECT id, nama, location, latitude, longitude FROM gyms WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.latitude == null || row.longitude == null) {
      return res.status(404).json({ error: "Gym not found or has invalid location data" });
    }
    res.json(addGmapsUrl(row));
  });
});

app.post('/api/gym', (req, res) => {
  const { nama, location, latitude, longitude } = req.body;
  if (!nama || !location || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Name, location, latitude, and longitude are required" });
  }
  const sql = "INSERT INTO gyms (nama, location, latitude, longitude) VALUES (?, ?, ?, ?)";
  db.run(sql, [nama, location, latitude, longitude], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const newGym = {
        id: this.lastID,
        nama: nama,
        location: location,
        latitude: latitude,
        longitude: longitude
      };
      res.status(201).json(addGmapsUrl(newGym));
  });
});


// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});