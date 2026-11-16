import mongoose from 'mongoose';

const couponSchema = mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true // Codes like "SAVE10" are easier to read in caps
    },
    expiry: { type: Date, required: true },
    discount: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;