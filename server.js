import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimiter from "express-rate-limit";



const app = express();
const PORT = 3030;
const limiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 300 });

app.use(cors());
app.use(express.json());
app.use(limiter);

app.get("/health", (req, res) => (
    res.status(200).json("Running...")
));


app.listen(PORT, () => {
    console.log(`Paylink server is running on PORT ${PORT}`)
})