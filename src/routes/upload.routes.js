import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { uploadSingleImage } from '../middlewares/image-upload.middleware.js';
import { uploadImage } from '../utils/uploadImage.js';

const router = express.Router();

router.post('/', protect, authorize('admin'), uploadSingleImage, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const url = await uploadImage(dataUri);
    return res.status(201).json({ url });
  } catch (error) {
    return next(error);
  }
});

export default router;
