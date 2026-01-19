import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from './src/config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, 'public/assets/images');

const uploadImages = async () => {
  try {
    const files = fs.readdirSync(imagesDir);
    const imageUrls = {};

    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
        const filePath = path.join(imagesDir, file);
        console.log(`Uploading ${file}...`);
        try {
          const result = await cloudinary.uploader.upload(filePath, {
            folder: 'fashion/products',
            use_filename: true,
            unique_filename: false,
          });
          imageUrls[file] = result.secure_url;
          console.log(`Uploaded: ${result.secure_url}`);
        } catch (uploadError) {
          console.error(`Failed to upload ${file}:`, uploadError.message);
        }
      }
    }

    console.log('\nImage URLs:');
    console.log(JSON.stringify(imageUrls, null, 2));
  } catch (error) {
    console.error('Script error:', error.message);
    process.exit(1);
  }
};

uploadImages();