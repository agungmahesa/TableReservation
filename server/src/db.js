const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
try {
    db.exec(schema);
    console.log('Database initialized successfully');
} catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
}

module.exports = db;
