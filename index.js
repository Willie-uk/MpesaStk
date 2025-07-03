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
  try {
    const { stkCallback } = req.body.Body;

    const {
      CheckoutRequestID,
      MerchantRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    const status = ResultCode === 0 ? "SUCCESS" : "FAILED";

    const transaction = await Transaction.findOneAndUpdate(
      { CheckoutRequestID },
      {
        status,
        receiptNumber:
          CallbackMetadata?.Item.find((i) => i.Name === "MpesaReceiptNumber")
            ?.Value || "",
        transactionDate:
          CallbackMetadata?.Item.find((i) => i.Name === "TransactionDate")
            ?.Value || "",
      },
      { new: true }
    );

    console.log("Updated transaction:", transaction);

    res.json({ success: true, status });
  } catch (error) {
    console.error("Callback error:", error);
    res
      .status(500)
      .json({ success: false, message: "Callback handling failed" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
