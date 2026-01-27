import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  image: { 
    type: String, 
    required: true // Useful for showing category "bubbles" on the homepage
  },
  description: { 
    type: String 
  }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
export default Category;