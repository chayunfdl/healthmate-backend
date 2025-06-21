// --- File: index.js (Dengan Daftar Gym yang Diperbanyak) ---

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const dbPath = 'gym_finder.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening local database", err.message);
  } else {
    console.log("Connected to the local SQLite database at:", dbPath);
    
    db.serialize(() => {
      // Skema tabel tidak berubah
      db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, token TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY, name TEXT UNIQUE)`);
      db.run(`CREATE TABLE IF NOT EXISTS gyms (id INTEGER PRIMARY KEY, nama TEXT, location TEXT, latitude REAL, longitude REAL, alamat_lengkap TEXT, foto_url TEXT)`);
      
      const defaultUsername = 'dian';
      const defaultPassword = 'password123';
      db.get("SELECT COUNT(*) as count FROM users WHERE username = ?", [defaultUsername], (err, row) => {
          if (row && row.count === 0) {
              const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
              db.run(sql, [defaultUsername, defaultPassword]);
              console.log(`Default user '${defaultUsername}' created.`);
          }
      });

      db.get("SELECT COUNT(*) as count FROM gyms", (err, row) => {
        if (err) {
            console.error("Error checking gyms table:", err.message);
            return;
        }
        if (row && row.count === 0) {
          console.log("Database is empty, seeding initial gym data...");
          
          // --- DAFTAR LOKASI DIUBAH: Menambahkan Jakarta ---
          const locationsToSeed = ['Sidoarjo', 'Surabaya', 'Malang', 'Jakarta'];
          
          // --- DAFTAR GYM DIUBAH: Menambahkan banyak data baru ---
          const gymsToSeed = [
            // Sidoarjo (Data lama)
            { nama: 'Fitness First Sidoarjo', location: 'Sidoarjo', lat: -7.4451, lon: 112.7153, alamat: 'Jl. Pahlawan No.1, Sidoarjo', foto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop' },
            { nama: 'Gold\'s Gym Sidoarjo', location: 'Sidoarjo', lat: -7.4389, lon: 112.7201, alamat: 'Lippo Plaza Sidoarjo, Jl. Jati Raya', foto: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=1975&auto=format&fit=crop' },
            { nama: 'One GOR Sidoarjo', location: 'Sidoarjo', lat: -7.4478, lon: 112.7183, alamat: 'GOR Delta Sidoarjo, Jl. Ponti', foto: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=2069&auto=format&fit=crop' },
            { nama: 'Deltasari Sport Center', location: 'Sidoarjo', lat: -7.3691, lon: 112.7405, alamat: 'Jl. Deltasari Indah No.37, Waru', foto: 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?q=80&w=2071&auto=format&fit=crop' },
            { nama: 'Planet Fitness Pondok Tjandra', location: 'Sidoarjo', lat: -7.3482, lon: 112.7663, alamat: 'Ruko Pondok Tjandra Indah, Jl. Palem', foto: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?q=80&w=2070&auto=format&fit=crop' },
            
            // Surabaya (Data lama dan baru)
            { nama: 'Atlas Sports Club', location: 'Surabaya', lat: -7.2798, lon: 112.7565, alamat: 'Jl. Dharmahusada Indah Barat III, Surabaya', foto: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop' },
            { nama: 'Urban Athletes', location: 'Surabaya', lat: -7.2885, lon: 112.7382, alamat: 'Marvell City Mall, Jl. Ngagel', foto: 'https://images.unsplash.com/photo-1540496905036-5937c10647cc?q=80&w=2070&auto=format&fit=crop' },
            { nama: 'Celebrity Fitness Galaxy Mall', location: 'Surabaya', lat: -7.2759, lon: 112.7845, alamat: 'Galaxy Mall 3, Jl. Dr. Ir. H. Soekarno', foto: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop' }, // DITAMBAHKAN
            { nama: 'Gold\'s Gym Grand City', location: 'Surabaya', lat: -7.2598, lon: 112.7483, alamat: 'Grand City Mall, Jl. Walikota Mustajab', foto: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=2071&auto=format&fit=crop' }, // DITAMBAHKAN
            { nama: 'A-GO Fitness', location: 'Surabaya', lat: -7.2892, lon: 112.6728, alamat: 'Pakuwon Mall, Jl. Mayjend. Jonosewojo', foto: 'https://images.unsplash.com/photo-1574680096145-f844349f8a27?q=80&w=2070&auto=format&fit=crop' }, // DITAMBAHKAN
            
            // Malang (Data lama dan baru)
            { nama: 'Malang Fitness Center', location: 'Malang', lat: -7.9754, lon: 112.6231, alamat: 'Jl. Semeru No.59, Malang', foto: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=1974&auto=format&fit=crop' },
            { nama: 'Universitas Brawijaya Sport Center', location: 'Malang', lat: -7.9536, lon: 112.6146, alamat: 'Jl. Veteran, Ketawanggede, Malang', foto: 'https://images.unsplash.com/photo-1590487988256-5ed24a3e3535?q=80&w=1974&auto=format&fit=crop' }, // DITAMBAHKAN
            { nama: 'Everyday Fitness Malang', location: 'Malang', lat: -7.9669, lon: 112.6322, alamat: 'Malang Town Square, Jl. Veteran No.2', foto: 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?q=80&w=2070&auto=format&fit=crop' }, // DITAMBAHKAN
            
            // Jakarta (Data baru)
            { nama: 'Fitness First Platinum', location: 'Jakarta', lat: -6.2246, lon: 106.8082, alamat: 'Pacific Place Mall, SCBD, Jakarta Selatan', foto: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=2070&auto=format&fit=crop' }, // DITAMBAHKAN
            { nama: 'Empire Fit Club', location: 'Jakarta', lat: -6.2263, lon: 106.8091, alamat: 'Sudirman Central Business District (SCBD)', foto: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?q=80&w=2070&auto=format&fit=crop' }, // DITAMBAHKAN
            { nama: 'SANA Kith & Kin', location: 'Jakarta', lat: -6.2588, lon: 106.7915, alamat: 'Jl. Panglima Polim V No.38, Kebayoran Baru', foto: 'https://images.unsplash.com/photo-1598289431512-b970a552d4c2?q=80&w=1943&auto=format&fit=crop' }, // DITAMBAHKAN
            { nama: 'Celebrity Fitness Kota Kasablanka', location: 'Jakarta', lat: -6.2238, lon: 106.8423, alamat: 'Mall Kota Kasablanka, Jl. Casablanca Raya', foto: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?q=80&w=1926&auto=format&fit=crop' }, // DITAMBAHKAN
          ];

          const locationStmt = db.prepare("INSERT INTO locations (name) VALUES (?)");
          locationsToSeed.forEach(loc => locationStmt.run(loc));
          locationStmt.finalize();

          const gymStmt = db.prepare("INSERT INTO gyms (nama, location, latitude, longitude, alamat_lengkap, foto_url) VALUES (?, ?, ?, ?, ?, ?)");
          gymsToSeed.forEach(gym => gymStmt.run(gym.nama, gym.location, gym.lat, gym.lon, gym.alamat, gym.foto));
          gymStmt.finalize();
          
          console.log("Seeding gyms complete.");
        } else {
          console.log("Database already contains gym data, skipping seed.");
        }
      });
    });
  }
});

// =================================
// Sisa kode (endpoints) tidak perlu diubah.
// Mereka sudah dirancang untuk menangani data yang diperbarui.
// =================================

// Authentication Service
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
  const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
  db.run(sql, [username, password], function(err) {
    if (err) return res.status(err.errno === 19 ? 409 : 500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, username: username });
  });
});
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || password !== user.password) return res.status(401).json({ error: "Invalid credentials" });
        const token = 'token-' + user.username + '-' + Date.now();
        const updateSql = "UPDATE users SET token = ? WHERE id = ?";
        db.run(updateSql, [token, user.id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            res.json({ message: "Login successful", token: token });
        });
    });
});

// Location Service
app.get('/api/location', (req, res) => {
  const sql = "SELECT id, name FROM locations";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Gym Service
const addGmapsUrl = (gym) => {
    if (!gym || gym.latitude == null || gym.longitude == null) return gym;
    return { ...gym, gmaps_url: `https://www.google.com/maps/search/?api=1&query=${gym.latitude},${gym.longitude}` };
};
app.get('/api/gym', (req, res) => {
  const sql = "SELECT id, nama, location, latitude, longitude, alamat_lengkap, foto_url FROM gyms";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.filter(gym => gym.latitude != null && gym.longitude != null).map(addGmapsUrl));
  });
});
app.get('/api/gym/search/:location', (req, res) => {
  const { location } = req.params;
  const sql = "SELECT id, nama, location, latitude, longitude, alamat_lengkap, foto_url FROM gyms WHERE location = ?";
  db.all(sql, [location], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.filter(gym => gym.latitude != null && gym.longitude != null).map(addGmapsUrl));
  });
});
app.get('/api/gym/:id', (req, res) => {
  if (isNaN(req.params.id)) return res.status(400).json({ error: 'Invalid ID format.' });
  const sql = "SELECT id, nama, location, latitude, longitude, alamat_lengkap, foto_url FROM gyms WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.latitude == null || row.longitude == null) return res.status(404).json({ error: "Gym not found" });
    res.json(addGmapsUrl(row));
  });
});
app.post('/api/gym', (req, res) => {
  const { nama, location, latitude, longitude, alamat_lengkap, foto_url } = req.body;
  if (!nama || !location || latitude === undefined || longitude === undefined || !alamat_lengkap || !foto_url) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const sql = "INSERT INTO gyms (nama, location, latitude, longitude, alamat_lengkap, foto_url) VALUES (?, ?, ?, ?, ?, ?)";
  db.run(sql, [nama, location, latitude, longitude, alamat_lengkap, foto_url], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const newGym = { id: this.lastID, nama, location, latitude, longitude, alamat_lengkap, foto_url };
      res.status(201).json(addGmapsUrl(newGym));
  });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});