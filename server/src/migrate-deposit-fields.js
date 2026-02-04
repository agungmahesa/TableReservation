const db = require('./db');

// Migration to add deposit fields to reservations table
try {
    console.log('Running migration: Add deposit fields to reservations...');

    // Check if columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(reservations)").all();
    const hasDepositRequired = tableInfo.some(col => col.name === 'deposit_required');
    const hasDepositPaid = tableInfo.some(col => col.name === 'deposit_paid');

    if (!hasDepositRequired) {
        db.prepare('ALTER TABLE reservations ADD COLUMN deposit_required BOOLEAN DEFAULT 0').run();
        console.log('✓ Added deposit_required column');
    } else {
        console.log('- deposit_required column already exists');
    }

    if (!hasDepositPaid) {
        db.prepare('ALTER TABLE reservations ADD COLUMN deposit_paid BOOLEAN DEFAULT 0').run();
        console.log('✓ Added deposit_paid column');
    } else {
        console.log('- deposit_paid column already exists');
    }

    console.log('Migration completed successfully!');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
