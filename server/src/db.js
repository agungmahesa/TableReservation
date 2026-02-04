const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:9mb8Lpb63CC.YU5@db.esrewpptsieedcthmwzq.supabase.co:5432/postgres',
});

const initializeDb = async () => {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    try {
        await pool.query(schema);
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Database initialization failed:', err);
        // Don't exit process here in dev, some errors might be "already exists" if schema.sql isn't fully idempotent
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initializeDb
};
