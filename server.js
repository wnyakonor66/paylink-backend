import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimiter from "express-rate-limit";
import authRoute from "./route/authRoute.js";
import walletRoute from "./route/walletRoute.js";
import transactionRoute from "./route/transactionRoute.js";

const app = express();
const PORT = 3030;
const limiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 300 });

app.use(cors());
app.use(express.json());
app.use(limiter);
app.use("/api/auth", authRoute);
app.use("/api/wallet", walletRoute);
app.use("/api/transaction", transactionRoute);


app.get("/health", (req, res) => (
    res.status(200).json("Running...")
));


app.listen(PORT, () => {
    console.log(`Paylink server is running on PORT ${PORT}`)
})