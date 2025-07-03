import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import connectDB from "./lib/db.js";
import { getAccessToken } from "./lib/auth.js";
import { stkPush } from "./lib/stkPush.js";
import Transaction from "./model/Transaction.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

connectDB();

app.post("/initiate", async (req, res) => {
  try {
    const { phoneNumber, amount, productName } = req.body;
    const accessToken = await getAccessToken();
    const initiateStkResponse = await stkPush(
      accessToken,
      phoneNumber,
      amount,
      productName
    );

    res.status(200).json({
      success: true,
      message: "STK push initiated",
      initiateStkResponse,
    });
  } catch (error) {
    console.log("Error initiating STK push", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate STK push",
    });
  }
});

// ✅ Callback endpoint using Mongoose
app.post("/callback", async (req, res) => {
  try {
    const { stkCallback } = req.body.Body;

    if (!stkCallback) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid callback structure" });
    }

    console.log("📦 Received Callback:", JSON.stringify(stkCallback, null, 2));

    const status = stkCallback.ResultCode === 0 ? "SUCCESS" : "FAILED";

    const updated = await Transaction.findOneAndUpdate(
      { CheckoutRequestID: stkCallback.CheckoutRequestID },
      { status },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    console.log("✅ Transaction status updated:", updated);

    res.json({ success: true, status, updated });
  } catch (error) {
    console.error("❌ Error updating transaction:", error);
    res
      .status(500)
      .json({ success: false, message: "Something went wrong", error });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
