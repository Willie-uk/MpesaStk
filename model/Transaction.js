import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  CheckoutRequestID: { type: String, unique: true },
  MerchantRequestID: String,
  amount: Number,
  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING",
  },
  phoneNumber: String,
  receiptNumber: String,
  transactionDate: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Transaction", transactionSchema);
