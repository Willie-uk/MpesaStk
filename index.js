import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getAccessToken } from "./lib/auth.js";
import { stkPush } from "./lib/stkPush.js";
import prisma from "./lib/db.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

app.post("/initiate", async (req, res) => {
  try {
    const { phoneNumber, amount, productName } = req.body;
    const accessToken = await getAccessToken();
    const initiateStk = await stkPush(
      accessToken,
      phoneNumber,
      amount,
      productName
    );

    res.status(200).json({
      success: true,
      message: "Access token fetched successfully",
      initiateStk,
    });
  } catch (error) {
    console.log("Error initiating STK push", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate STK push",
    });
  }
});

app.post("/callback", async (req, res) => {
  try {
    const stkCallbackData = req.body.Body;
    let status = null;
    if (stkCallbackData.Result === "0") {
      status = "Success";
    } else {
      status: "Failed";
    }
    await prisma.transaction.update({
      where: {
        CheckoutRequestID: stkCallbackData.CheckoutRequestID,
      },
      data: {
        status: status,
        responseCode: stkCallbackData.ResultCode,
        responseDescription: stkCallbackData.ResultDesc,
      },
    });
    res.json({ status, stkCallbackData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing callback",
      error,
    });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
