const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const router = express.Router();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configure multer for APK uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/apk-updates';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const versionName = req.body.versionName;
    cb(null, `app-v${versionName}-${timestamp}.apk`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.android.package-archive' || 
        file.originalname.endsWith('.apk')) {
      cb(null, true);
    } else {
      cb(new Error('Only APK files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// GET /api/app-updates/check - Check for updates (mobile app)
router.get('/check', async (req, res) => {
  try {
    const currentVersion = parseInt(req.query.currentVersion);
    
    if (!currentVersion) {
      return res.status(400).json({ error: 'Current version required' });
    }

    // Get latest active update
    const query = `
      SELECT * FROM app_updates 
      WHERE is_active = true 
      AND version_code > $1 
      AND (min_supported_version IS NULL OR min_supported_version <= $2)
      ORDER BY version_code DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [currentVersion, currentVersion]);
    const updates = result.rows;
    
    if (updates.length === 0) {
      return res.json({ hasUpdate: false });
    }

    const update = updates[0];
    
    res.json({
      hasUpdate: true,
      update: {
        id: update.id,
        versionName: update.version_name,
        versionCode: update.version_code,
        releaseNotes: update.release_notes,
        bugFixes: update.bug_fixes,
        newFeatures: update.new_features,
        isMandatory: update.is_mandatory,
        downloadUrl: `/api/app-updates/${update.id}/download`,
        fileSize: update.apk_file_size
      }
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    res.status(500).json({ error: 'Failed to check for updates' });
  }
});

// GET /api/app-updates/:id/download - Download APK
router.get('/:id/download', async (req, res) => {
  try {
    const updateId = req.params.id;
    
    const query = 'SELECT * FROM app_updates WHERE id = $1 AND is_active = true';
    const result = await pool.query(query, [updateId]);
    const updates = result.rows;
    
    if (updates.length === 0) {
      return res.status(404).json({ error: 'Update not found' });
    }

    const update = updates[0];
    const filePath = path.join(__dirname, '../../', update.apk_file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'APK file not found' });
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="app-v${update.version_name}.apk"`);
    res.setHeader('Content-Length', update.apk_file_size);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading APK:', error);
    res.status(500).json({ error: 'Failed to download APK' });
  }
});

// Admin routes (require authentication)
router.use('/admin', requireAdminAuth);

// GET /api/app-updates/admin - Get all updates (admin)
router.get('/admin', async (req, res) => {
  try {
    const query = 'SELECT * FROM app_updates ORDER BY version_code DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching updates:', error);
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
});

// POST /api/app-updates/admin - Upload new update (admin)
router.post('/admin', upload.single('apk'), async (req, res) => {
  try {
    const {
      versionName,
      versionCode,
      releaseNotes,
      bugFixes,
      newFeatures,
      isMandatory,
      minSupportedVersion
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'APK file is required' });
    }

    // Check if version already exists
    const existingQuery = 'SELECT id FROM app_updates WHERE version_code = $1';
    const existingResult = await pool.query(existingQuery, [versionCode]);
    
    if (existingResult.rows.length > 0) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Version code already exists' });
    }

    const insertQuery = `
      INSERT INTO app_updates (
        version_name, version_code, apk_file_path, apk_file_size,
        release_notes, bug_fixes, new_features, is_mandatory, min_supported_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      versionName,
      parseInt(versionCode),
      req.file.path,
      req.file.size,
      releaseNotes,
      bugFixes || null,
      newFeatures || null,
      isMandatory === 'true',
      minSupportedVersion ? parseInt(minSupportedVersion) : null
    ];

    const result = await pool.query(insertQuery, values);
    
    res.json({
      success: true,
      updateId: result.rows[0].id,
      message: 'Update uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading update:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload update' });
  }
});

// PATCH /api/app-updates/admin/:id/toggle - Toggle update status
router.patch('/admin/:id/toggle', async (req, res) => {
  try {
    const updateId = req.params.id;
    
    const query = 'UPDATE app_updates SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [updateId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling update status:', error);
    res.status(500).json({ error: 'Failed to toggle update status' });
  }
});

// DELETE /api/app-updates/admin/:id - Delete update
router.delete('/admin/:id', async (req, res) => {
  try {
    const updateId = req.params.id;
    
    // Get file path before deleting
    const selectQuery = 'SELECT apk_file_path FROM app_updates WHERE id = $1';
    const selectResult = await pool.query(selectQuery, [updateId]);
    
    if (selectResult.rows.length > 0) {
      const filePath = path.join(__dirname, '../../', selectResult.rows[0].apk_file_path);
      
      // Delete from database
      const deleteQuery = 'DELETE FROM app_updates WHERE id = $1';
      await pool.query(deleteQuery, [updateId]);
      
      // Delete file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting update:', error);
    res.status(500).json({ error: 'Failed to delete update' });
  }
});

// Middleware to require admin authentication
function requireAdminAuth(req, res, next) {
  // Implement your admin authentication logic here
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  
  next();
}

function isValidAdminToken(token) {
  // Implement your token validation logic
  return true; // Placeholder
}

module.exports = router;