const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');

// Initialize Supabase Client lazily to prevent startup crash if env vars are missing
let supabase;
const getSupabase = () => {
    if (!supabase) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
        }
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    }
    return supabase;
};

// Use memory storage for Multer
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports images!"));
    }
}).single('image');

exports.uploadImage = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }

        try {
            const file = req.file;
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileName = `menu-${uniqueSuffix}${path.extname(file.originalname)}`;

            const client = getSupabase();
            const { data, error } = await client.storage
                .from('menu-images')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw error;
            }

            // Get Public URL
            const { data: { publicUrl } } = client.storage
                .from('menu-images')
                .getPublicUrl(fileName);

            res.json({ url: publicUrl });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to upload to Supabase Storage: ' + error.message });
        }
    });
};
