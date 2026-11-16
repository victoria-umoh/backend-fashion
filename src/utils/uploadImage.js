import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (dataURI) => {
  try {
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'fashion/products',
      use_filename: true,
      unique_filename: false,
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary image upload failed:', error.message);
    throw Object.assign(new Error('Image upload failed.'), { statusCode: 502 });
  }
};