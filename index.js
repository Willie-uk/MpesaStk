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

// ✅ Callback URL for Safaricom to send final status
app.post("/callback", async (req, res) => {
  console.log("📥 Raw Callback Body:", JSON.stringify(req.body, null, 2));
  try {
    if (!req.body?.Body?.stkCallback) {
      console.error("❌ Missing stkCallback in body:", req.body);
      return res
        .status(400)
        .json({ success: false, message: "Invalid callback structure" });
    }
    const { stkCallback } = req.body.Body;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    const status = ResultCode === 0 ? "SUCCESS" : "FAILED";

    // Extract values safely
    const amount =
      CallbackMetadata?.Item.find((i) => i.Name === "Amount")?.Value || 0;
    const receiptNumber =
      CallbackMetadata?.Item.find((i) => i.Name === "MpesaReceiptNumber")
        ?.Value || "";
    const transactionDate =
      CallbackMetadata?.Item.find((i) => i.Name === "TransactionDate")?.Value ||
      "";
    const phoneNumber =
      CallbackMetadata?.Item.find((i) => i.Name === "PhoneNumber")?.Value || "";

    // Update existing transaction
    const updated = await Transaction.findOneAndUpdate(
      { CheckoutRequestID },
      {
        status,
        amount,
        receiptNumber,
        transactionDate,
        phoneNumber,
      },
      { new: true }
    );

    console.log("✅ Callback processed and transaction updated:", updated);

    res.status(200).json({ success: true, updated });
  } catch (error) {
    console.error("❌ Error handling callback:", error);
    res
      .status(500)
      .json({ success: false, message: "Callback handling failed", error });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
