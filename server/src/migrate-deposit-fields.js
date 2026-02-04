const db = require('./db');

const migrate = async () => {
    try {
        console.log('Running migration: Add deposit fields to reservations...');

        // Check if columns already exist in PostgreSQL
        const checkResult = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservations' AND column_name IN ('deposit_required', 'deposit_paid')
        `);

        const existingColumns = checkResult.rows.map(row => row.column_name);
        const hasDepositRequired = existingColumns.includes('deposit_required');
        const hasDepositPaid = existingColumns.includes('deposit_paid');

        if (!hasDepositRequired) {
            await db.query('ALTER TABLE reservations ADD COLUMN deposit_required INTEGER DEFAULT 0');
            console.log('✓ Added deposit_required column');
        } else {
            console.log('- deposit_required column already exists');
        }

        if (!hasDepositPaid) {
            await db.query('ALTER TABLE reservations ADD COLUMN deposit_paid INTEGER DEFAULT 0');
            console.log('✓ Added deposit_paid column');
        } else {
            console.log('- deposit_paid column already exists');
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
