const db = require('../db');
const { z } = require('zod');
const config = require('../config');

// Validation Schemas
const reservationSchema = z.object({
    customer_name: z.string().min(1),
    customer_email: z.string().email(),
    customer_phone: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time_slot: z.string().regex(/^\d{2}:\d{2}$/),
    guest_count: z.number().int().positive(),
    special_requests: z.string().optional(),
    seating_preference: z.enum(['Indoor', 'Outdoor']).optional(),
});

exports.checkAvailability = (req, res) => {
    try {
        const { date, guests, location } = req.query;

        if (!date || !guests) {
            return res.status(400).json({ error: 'Date and guest count are required' });
        }

        // Get restaurant hours from settings
        const hoursRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('restaurant_hours');
        let timeSlots = config.TIME_SLOTS; // Fallback to default

        if (hoursRow) {
            try {
                const hours = JSON.parse(hoursRow.value);
                if (hours.open && hours.close) {
                    // Generate time slots from open to close with configured interval
                    timeSlots = [];
                    const interval = hours.interval || 30; // Default to 30 minutes
                    const [openHour, openMin] = hours.open.split(':').map(Number);
                    const [closeHour, closeMin] = hours.close.split(':').map(Number);

                    let currentHour = openHour;
                    let currentMin = openMin;

                    // Loop until current time exceeds close time
                    // The condition needs to be carefully constructed to include the last slot if it aligns with close time
                    while (currentHour < closeHour || (currentHour === closeHour && currentMin <= closeMin)) {
                        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

                        // Only add the slot if it's not past the closing time
                        if (currentHour < closeHour || (currentHour === closeHour && currentMin <= closeMin)) {
                            timeSlots.push(timeStr);
                        }

                        // Increment by configured interval
                        currentMin += interval;
                        currentHour += Math.floor(currentMin / 60);
                        currentMin = currentMin % 60;
                    }
                }
            } catch (e) {
                console.error('Failed to parse restaurant hours:', e);
            }
        }

        // Base query for tables
        let tableQuery = 'SELECT * FROM tables WHERE capacity >= ? AND status != ?';
        const tableParams = [guests, 'Blocked'];

        if (location) {
            tableQuery += ' AND location = ?';
            tableParams.push(location);
        }

        const tables = db.prepare(tableQuery).all(...tableParams);

        // Get reservations for the date
        const reservations = db.prepare('SELECT * FROM reservations WHERE date = ? AND status != ?').all(date, 'Cancelled');

        const slotsStatus = timeSlots.map(slot => {
            // Use smart assignment to check if this slot can accommodate the guests
            const assignedTables = findBestTableAssignment(guests, date, slot, location);

            return {
                time: slot,
                available: assignedTables !== null && assignedTables.length > 0
            };
        });

        res.json({ slots: slotsStatus });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Smart Table Assignment Algorithm
 * Implements Best-Fit matching and Table Joining logic
 * @param {number} guestCount - Number of guests
 * @param {string} date - Reservation date
 * @param {string} timeSlot - Reservation time slot
 * @param {string} location - Preferred location (Indoor/Outdoor)
 * @returns {Array|null} - Array of table IDs or null if no solution found
 */
function findBestTableAssignment(guestCount, date, timeSlot, location = null) {
    // Get all tables matching location preference
    let tableQuery = 'SELECT * FROM tables WHERE status != ?';
    const tableParams = ['Blocked'];

    if (location) {
        tableQuery += ' AND location = ?';
        tableParams.push(location);
    }

    const allTables = db.prepare(tableQuery).all(...tableParams);

    // Get reserved table IDs for this slot from reservation_assignments
    const reservedTableIds = db.prepare(`
        SELECT DISTINCT ra.table_id 
        FROM reservation_assignments ra
        JOIN reservations r ON ra.reservation_id = r.id
        WHERE r.date = ? AND r.time_slot = ? AND r.status != ?
    `).all(date, timeSlot, 'Cancelled').map(row => row.table_id);

    // Filter available tables
    const availableTables = allTables.filter(t => !reservedTableIds.includes(t.id));

    if (availableTables.length === 0) {
        return null;
    }

    // STRATEGY 1: Best-Fit Single Table
    // Find tables that can accommodate guests, sort by capacity (smallest first)
    const suitableSingleTables = availableTables
        .filter(t => t.capacity >= guestCount)
        .sort((a, b) => a.capacity - b.capacity);

    if (suitableSingleTables.length > 0) {
        // Return the best-fit single table
        return [suitableSingleTables[0].id];
    }

    // STRATEGY 2: Table Joining (only if no single table fits)
    // Only use joinable tables for combinations
    const joinableTables = availableTables
        .filter(t => t.is_joinable === 1)
        .sort((a, b) => b.capacity - a.capacity); // Sort by capacity descending

    if (joinableTables.length === 0) {
        return null;
    }

    // Try to find minimum combination of tables
    // Use greedy algorithm: pick largest tables first
    let totalCapacity = 0;
    const selectedTables = [];

    for (const table of joinableTables) {
        if (totalCapacity >= guestCount) {
            break;
        }
        selectedTables.push(table.id);
        totalCapacity += table.capacity;
    }

    // Check if combination meets requirement
    if (totalCapacity >= guestCount) {
        return selectedTables;
    }

    // No solution found
    return null;
}

exports.createReservation = (req, res) => {
    try {
        const data = reservationSchema.parse(req.body);
        const {
            customer_name, customer_email, customer_phone,
            date, time_slot, guest_count,
            special_requests, seating_preference
        } = data;

        // Use smart table assignment algorithm
        const assignedTableIds = findBestTableAssignment(
            guest_count,
            date,
            time_slot,
            seating_preference
        );

        if (!assignedTableIds || assignedTableIds.length === 0) {
            return res.status(409).json({
                error: 'Kapasitas tidak mencukupi untuk waktu tersebut'
            });
        }

        // Check for deposit requirement from dynamic settings
        const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('deposit_config');
        let depositThreshold = 5;
        let depositAmount = 50000;

        if (settingsRow) {
            try {
                const config = JSON.parse(settingsRow.value);
                depositThreshold = config.threshold || 5;
                depositAmount = config.amount || 50000;
            } catch (e) {
                console.error('Failed to parse deposit config', e);
            }
        }

        const initialStatus = guest_count >= depositThreshold ? 'Pending Payment' : 'Confirmed';
        const depositRequired = guest_count >= depositThreshold;

        // Create Reservation (use first table as primary for backward compatibility)
        const stmt = db.prepare(`
      INSERT INTO reservations (
        table_id, customer_name, customer_email, customer_phone, 
        date, time_slot, guest_count, special_requests, seating_preference, status, deposit_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const info = stmt.run(
            assignedTableIds[0], customer_name, customer_email, customer_phone,
            date, time_slot, guest_count, special_requests || '', seating_preference || null, initialStatus, depositRequired ? 1 : 0
        );

        const reservationId = info.lastInsertRowid;

        // Insert all assigned tables into reservation_assignments
        const assignmentStmt = db.prepare(`
            INSERT INTO reservation_assignments (reservation_id, table_id) VALUES (?, ?)
        `);

        for (const tableId of assignedTableIds) {
            assignmentStmt.run(reservationId, tableId);
        }

        // Placeholder for Email/SMS
        console.log(`[Notification] Email sent to ${customer_email} for reservation #${reservationId}`);
        console.log(`[Assignment] Tables assigned: ${assignedTableIds.join(', ')}`);

        res.status(201).json({
            id: reservationId,
            message: 'Reservation created successfully',
            assignedTables: assignedTableIds,
            requiresDeposit: depositRequired,
            depositAmount: depositRequired ? depositAmount : 0
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getReservation = (req, res) => {
    try {
        const reservation = db.prepare(`
      SELECT r.*, t.name as table_name, t.location 
      FROM reservations r
      JOIN tables t ON r.table_id = t.id
      WHERE r.id = ?
    `).get(req.params.id);

        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        // Get all assigned tables
        const assignedTables = db.prepare(`
            SELECT t.id, t.name, t.capacity
            FROM reservation_assignments ra
            JOIN tables t ON ra.table_id = t.id
            WHERE ra.reservation_id = ?
        `).all(req.params.id);

        reservation.assigned_tables = assignedTables;
        reservation.table_names = assignedTables.map(t => t.name).join(' + ');

        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllReservations = (req, res) => {
    try {
        const { date } = req.query;
        let query = `
      SELECT r.*, t.name as table_name 
      FROM reservations r 
      JOIN tables t ON r.table_id = t.id
    `;
        const params = [];

        if (date) {
            query += ` WHERE r.date = ?`;
            params.push(date);
        }

        query += ` ORDER BY r.date, r.time_slot`;

        const reservations = db.prepare(query).all(...params);

        // Enrich each reservation with all assigned tables
        const enrichedReservations = reservations.map(reservation => {
            const assignedTables = db.prepare(`
                SELECT t.id, t.name, t.capacity
                FROM reservation_assignments ra
                JOIN tables t ON ra.table_id = t.id
                WHERE ra.reservation_id = ?
            `).all(reservation.id);

            return {
                ...reservation,
                assigned_tables: assignedTables,
                table_names: assignedTables.map(t => t.name).join(' + ')
            };
        });

        res.json(enrichedReservations);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateReservationStatus = (req, res) => {
    try {
        const { status } = req.body; // Confirmed, Cancelled, Completed, Pending Payment
        const stmt = db.prepare('UPDATE reservations SET status = ? WHERE id = ?');
        const info = stmt.run(status, req.params.id);

        if (info.changes === 0) return res.status(404).json({ error: 'Reservation not found' });

        res.json({ message: 'Reservation status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateDepositStatus = (req, res) => {
    try {
        const { deposit_paid } = req.body;
        const stmt = db.prepare('UPDATE reservations SET deposit_paid = ? WHERE id = ?');
        const info = stmt.run(deposit_paid ? 1 : 0, req.params.id);

        if (info.changes === 0) return res.status(404).json({ error: 'Reservation not found' });

        res.json({ message: 'Deposit status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateReservation = (req, res) => {
    try {
        const {
            customer_name, customer_email, customer_phone,
            date, time_slot, guest_count, special_requests,
            status, table_id
        } = req.body;

        const stmt = db.prepare(`
            UPDATE reservations SET 
                customer_name = ?, customer_email = ?, customer_phone = ?,
                date = ?, time_slot = ?, guest_count = ?, special_requests = ?,
                status = ?, table_id = ?
            WHERE id = ?
        `);

        const info = stmt.run(
            customer_name, customer_email, customer_phone,
            date, time_slot, guest_count, special_requests || '',
            status, table_id, req.params.id
        );

        if (info.changes === 0) return res.status(404).json({ error: 'Reservation not found' });
        res.json({ message: 'Reservation updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteReservation = (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM reservations WHERE id = ?');
        const info = stmt.run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ error: 'Reservation not found' });
        res.json({ message: 'Reservation deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
