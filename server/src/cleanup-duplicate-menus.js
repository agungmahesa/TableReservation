const db = require('./db');

console.log('Checking for duplicate menu items...');

try {
    // Find duplicates (case-insensitive)
    const duplicates = db.prepare(`
        SELECT LOWER(name) as lower_name, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM menu_items
        GROUP BY LOWER(name)
        HAVING count > 1
    `).all();

    if (duplicates.length === 0) {
        console.log('✓ No duplicate menu items found!');
        process.exit(0);
    }

    console.log(`Found ${duplicates.length} duplicate menu name(s):`);

    duplicates.forEach(dup => {
        const ids = dup.ids.split(',').map(Number);
        console.log(`\n- "${dup.lower_name}" (${dup.count} occurrences)`);
        console.log(`  IDs: ${ids.join(', ')}`);

        // Keep the first ID, delete the rest
        const toDelete = ids.slice(1);
        console.log(`  Keeping ID ${ids[0]}, deleting IDs: ${toDelete.join(', ')}`);

        toDelete.forEach(id => {
            db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
            console.log(`  ✓ Deleted menu item ID ${id}`);
        });
    });

    console.log('\n✓ Duplicate cleanup completed successfully!');

    // Show remaining menu items
    const remaining = db.prepare('SELECT id, name FROM menu_items ORDER BY name').all();
    console.log(`\nRemaining menu items (${remaining.length} total):`);
    remaining.forEach(item => {
        console.log(`  - ${item.name} (ID: ${item.id})`);
    });

} catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
}
