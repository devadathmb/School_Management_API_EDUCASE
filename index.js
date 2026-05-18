// index.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'school_db'
};

app.post('/addSchool', async (req, res) => {
    const { name, address, latitude, longitude } = req.body;
    
    if (!name || typeof name !== 'string' || !address || typeof address !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: 'Invalid or missing input data.' });
    }
    
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)', [name, address, latitude, longitude]);
        await connection.end();
        res.status(201).json({ message: 'School added successfully.', schoolId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

app.get('/listSchools', async (req, res) => {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    }
    
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM schools');
        await connection.end();

        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; 
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        };

        const sortedSchools = rows.map(school => ({
            ...school,
            distance: calculateDistance(userLat, userLon, school.latitude, school.longitude)
        })).sort((a, b) => a.distance - b.distance);

        res.status(200).json(sortedSchools);
    } catch (error) {
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));