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

exports.checkAvailability = async (req, res) => {
    try {
        const { date, guests, location } = req.query;

        if (!date || !guests) {
            return res.status(400).json({ error: 'Date and guest count are required' });
        }

        // Get restaurant hours from settings
        const hoursResult = await db.query('SELECT value FROM settings WHERE key = $1', ['restaurant_hours']);
        const hoursRow = hoursResult.rows[0];
        let timeSlots = config.TIME_SLOTS; // Fallback to default

        if (hoursRow) {
            try {
                const hours = typeof hoursRow.value === 'string' ? JSON.parse(hoursRow.value) : hoursRow.value;
                if (hours.open && hours.close) {
                    // Generate time slots from open to close with configured interval
                    timeSlots = [];
                    const interval = hours.interval || 30; // Default to 30 minutes
                    const [openHour, openMin] = hours.open.split(':').map(Number);
                    const [closeHour, closeMin] = hours.close.split(':').map(Number);

                    let currentHour = openHour;
                    let currentMin = openMin;

                    while (currentHour < closeHour || (currentHour === closeHour && currentMin <= closeMin)) {
                        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
                        if (currentHour < closeHour || (currentHour === closeHour && currentMin <= closeMin)) {
                            timeSlots.push(timeStr);
                        }
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
        let tableQuery = 'SELECT * FROM tables WHERE capacity >= $1 AND status != $2';
        const tableParams = [guests, 'Blocked'];

        if (location) {
            tableQuery += ' AND location = $3';
            tableParams.push(location);
        }

        const tablesResult = await db.query(tableQuery, tableParams);
        const tables = tablesResult.rows;

        // Get reservations for the date
        const resListResult = await db.query('SELECT * FROM reservations WHERE date = $1 AND status != $2', [date, 'Cancelled']);
        const reservations = resListResult.rows;

        const slotsStatus = [];
        for (const slot of timeSlots) {
            // Use smart assignment to check if this slot can accommodate the guests
            const assignedTables = await findBestTableAssignment(guests, date, slot, location);

            slotsStatus.push({
                time: slot,
                available: assignedTables !== null && assignedTables.length > 0
            });
        }

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
async function findBestTableAssignment(guestCount, date, timeSlot, location = null) {
    // Get all tables matching location preference
    let tableQuery = 'SELECT * FROM tables WHERE status != $1';
    const tableParams = ['Blocked'];

    if (location) {
        tableQuery += ' AND location = $2';
        tableParams.push(location);
    }

    const allTablesResult = await db.query(tableQuery, tableParams);
    const allTables = allTablesResult.rows;

    // Get reserved table IDs for this slot from reservation_assignments
    const reservedTablesResult = await db.query(`
        SELECT DISTINCT ra.table_id 
        FROM reservation_assignments ra
        JOIN reservations r ON ra.reservation_id = r.id
        WHERE r.date = $1 AND r.time_slot = $2 AND r.status != $3
    `, [date, timeSlot, 'Cancelled']);
    const reservedTableIds = reservedTablesResult.rows.map(row => row.table_id);

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

exports.createReservation = async (req, res) => {
    try {
        const data = reservationSchema.parse(req.body);
        const {
            customer_name, customer_email, customer_phone,
            date, time_slot, guest_count,
            special_requests, seating_preference
        } = data;

        // Use smart table assignment algorithm
        const assignedTableIds = await findBestTableAssignment(
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
        const settingsResult = await db.query('SELECT value FROM settings WHERE key = $1', ['deposit_config']);
        const settingsRow = settingsResult.rows[0];
        let depositThreshold = 5;
        let depositAmount = 50000;

        if (settingsRow) {
            try {
                const config = typeof settingsRow.value === 'string' ? JSON.parse(settingsRow.value) : settingsRow.value;
                depositThreshold = config.threshold || 5;
                depositAmount = config.amount || 50000;
            } catch (e) {
                console.error('Failed to parse deposit config', e);
            }
        }

        const initialStatus = guest_count >= depositThreshold ? 'Pending Payment' : 'Confirmed';
        const depositRequired = guest_count >= depositThreshold;

        // Create Reservation (use first table as primary for backward compatibility)
        const resResult = await db.query(`
      INSERT INTO reservations (
        table_id, customer_name, customer_email, customer_phone, 
        date, time_slot, guest_count, special_requests, seating_preference, status, deposit_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
            assignedTableIds[0], customer_name, customer_email, customer_phone,
            date, time_slot, guest_count, special_requests || '', seating_preference || null, initialStatus, depositRequired ? 1 : 0
        ]);

        const reservationId = resResult.rows[0].id;

        // Insert all assigned tables into reservation_assignments
        for (const tableId of assignedTableIds) {
            await db.query(
                'INSERT INTO reservation_assignments (reservation_id, table_id) VALUES ($1, $2)',
                [reservationId, tableId]
            );
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

exports.getReservation = async (req, res) => {
    try {
        const result = await db.query(`
      SELECT r.*, t.name as table_name, t.location 
      FROM reservations r
      JOIN tables t ON r.table_id = t.id
      WHERE r.id = $1
    `, [req.params.id]);

        const reservation = result.rows[0];
        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        // Get all assigned tables
        const tablesResult = await db.query(`
            SELECT t.id, t.name, t.capacity
            FROM reservation_assignments ra
            JOIN tables t ON ra.table_id = t.id
            WHERE ra.reservation_id = $1
        `, [req.params.id]);

        reservation.assigned_tables = tablesResult.rows;
        reservation.table_names = tablesResult.rows.map(t => t.name).join(' + ');

        res.json(reservation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllReservations = async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
      SELECT r.*, t.name as table_name 
      FROM reservations r 
      JOIN tables t ON r.table_id = t.id
    `;
        const params = [];

        if (date) {
            query += ` WHERE r.date = $1`;
            params.push(date);
        }

        query += ` ORDER BY r.date, r.time_slot`;

        const result = await db.query(query, params);
        const reservations = result.rows;

        // Enrich each reservation with all assigned tables
        const enrichedReservations = [];
        for (const reservation of reservations) {
            const tablesResult = await db.query(`
                SELECT t.id, t.name, t.capacity
                FROM reservation_assignments ra
                JOIN tables t ON ra.table_id = t.id
                WHERE ra.reservation_id = $1
            `, [reservation.id]);

            enrichedReservations.push({
                ...reservation,
                assigned_tables: tablesResult.rows,
                table_names: tablesResult.rows.map(t => t.name).join(' + ')
            });
        }

        res.json(enrichedReservations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateReservationStatus = async (req, res) => {
    try {
        const { status } = req.body; // Confirmed, Cancelled, Completed, Pending Payment
        const result = await db.query('UPDATE reservations SET status = $1 WHERE id = $2', [status, req.params.id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Reservation not found' });

        res.json({ message: 'Reservation status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateDepositStatus = async (req, res) => {
    try {
        const { deposit_paid } = req.body;
        const result = await db.query('UPDATE reservations SET deposit_paid = $1 WHERE id = $2', [deposit_paid ? 1 : 0, req.params.id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Reservation not found' });

        res.json({ message: 'Deposit status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateReservation = async (req, res) => {
    try {
        const {
            customer_name, customer_email, customer_phone,
            date, time_slot, guest_count, special_requests,
            status, table_id
        } = req.body;

        const result = await db.query(`
            UPDATE reservations SET 
                customer_name = $1, customer_email = $2, customer_phone = $3,
                date = $4, time_slot = $5, guest_count = $6, special_requests = $7,
                status = $8, table_id = $9
            WHERE id = $10
        `, [
            customer_name, customer_email, customer_phone,
            date, time_slot, guest_count, special_requests || '',
            status, table_id, req.params.id
        ]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Reservation not found' });
        res.json({ message: 'Reservation updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteReservation = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM reservations WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Reservation not found' });
        res.json({ message: 'Reservation deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
