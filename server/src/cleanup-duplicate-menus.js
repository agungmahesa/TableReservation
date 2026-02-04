const db = require('./db');

const cleanup = async () => {
    console.log('Checking for duplicate menu items...');

    try {
        // Find duplicates (case-insensitive)
        const result = await db.query(`
            SELECT LOWER(name) as lower_name, COUNT(*) as count, STRING_AGG(id::text, ',') as ids
            FROM menu_items
            GROUP BY LOWER(name)
            HAVING COUNT(*) > 1
        `);

        const duplicates = result.rows;

        if (duplicates.length === 0) {
            console.log('✓ No duplicate menu items found!');
            process.exit(0);
        }

        console.log(`Found ${duplicates.length} duplicate menu name(s):`);

        for (const dup of duplicates) {
            const ids = dup.ids.split(',').map(Number);
            console.log(`\n- "${dup.lower_name}" (${dup.count} occurrences)`);
            console.log(`  IDs: ${ids.join(', ')}`);

            // Keep the first ID, delete the rest
            const toDelete = ids.slice(1);
            console.log(`  Keeping ID ${ids[0]}, deleting IDs: ${toDelete.join(', ')}`);

            for (const id of toDelete) {
                await db.query('DELETE FROM menu_items WHERE id = $1', [id]);
                console.log(`  ✓ Deleted menu item ID ${id}`);
            }
        }

        console.log('\n✓ Duplicate cleanup completed successfully!');

        // Show remaining menu items
        const remainingResult = await db.query('SELECT id, name FROM menu_items ORDER BY name');
        const remaining = remainingResult.rows;
        console.log(`\nRemaining menu items (${remaining.length} total):`);
        remaining.forEach(item => {
            console.log(`  - ${item.name} (ID: ${item.id})`);
        });

        process.exit(0);

    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

cleanup();
