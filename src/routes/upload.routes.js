import path from 'path';
import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middlewares/auth.middleware.js';


const router = express.Router();

// 1. Define Storage Engine
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Files will be saved in the 'uploads' folder
  },
  filename(req, file, cb) {
    // Rename file to avoid duplicates: fieldname-timestamp.extension
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// 2. Filter File Types
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images only!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// 3. The Route
router.post('/', protect, authorize('admin'), upload.single('image'), (req, res) => {
  try {
    console.log('Upload request received');
    console.log('User:', req.user);
    console.log('File:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Return the file path with forward slashes
    const filePath = `/${req.file.path.replace(/\\/g, '/')}`;
    console.log('File uploaded successfully:', filePath);
    res.json({ path: filePath });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

export default router;




