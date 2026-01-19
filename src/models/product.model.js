// models/productModel.js
import mongoose from 'mongoose';
import { reviewSchema } from './review.model.js';

const productSchema = mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, default: '/images/sample.jpg' },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    countInStock: { type: Number, required: true, default: 0 },
    sizes: [String], // Array for fashion sizes like ['S', 'M', 'L']
    colors: [String],
    reviews: [reviewSchema],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
    promoPrice: { type: Number, default: 0 }, // The sale price
    onSale: { type: Boolean, default: false },
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;