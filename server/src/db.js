const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:9mb8Lpb63CC.YU5@db.esrewpptsieedcthmwzq.supabase.co:5432/postgres',
});

const initializeDb = async () => {
    console.log('Verifying database connection...');
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('Database connection verified.');

        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await pool.query(schema);
        console.log('Database schema initialization completed.');
    } catch (err) {
        console.error('CRITICAL: Database initialization failed:', err.message);
        if (process.env.VERCEL) {
            // Rethrow in production to make it visible in logs/crashes if preferred, 
            // but for now we log with detail.
            console.error('Ensure DATABASE_URL is correct in Vercel settings.');
        }
        throw err; // Rethrow to be caught by the caller
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initializeDb
};
