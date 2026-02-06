const db = require('../db');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // For simplicity in this demo:
        const lowerUsername = username.toLowerCase();
        if (lowerUsername === 'admin' && password === 'Strugle1!@') {
            return res.json({ token: 'mock-token-123', role: 'Admin' });
        }
        if (lowerUsername === 'staff' && password === 'Starline1!') {
            return res.json({ token: 'mock-token-staff-123', role: 'Staff' });
        }
        if (lowerUsername === 'viewer' && password === 'viewer') {
            return res.json({ token: 'mock-token-viewer-123', role: 'Viewer' });
        }

        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
