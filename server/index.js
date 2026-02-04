const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const db = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic Route
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h1 style="color: #c5a059;">Lumina Dining API</h1>
            <p>Backend server is running correctly.</p>
            <p>Access the frontend at <a href="http://localhost:5174">http://localhost:5174</a></p>
        </div>
    `);
});

const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

// Export app for Vercel
module.exports = app;

// Initialize DB and start server only if running directly
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    db.initializeDb().then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }).catch(err => {
        console.error('Failed to start server:', err);
    });
} else {
    // In Vercel, we still want to ensure DB is initialized on the first request or during cold start
    // However, serverless functions are stateless. We'll call initializeDb but it should be fast
    db.initializeDb().catch(err => console.error('Vercel DB Init Error:', err));
}
