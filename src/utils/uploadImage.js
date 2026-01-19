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
    throw new Error('Image upload failed');
  }
};