import express from "express";
import {requireAuth} from "../middleware/auth.js";
import prisma from "../prisma/client.js";
import {z} from "zod";

const router = express.Router();
router.use(requireAuth);

router.get("/", async(req, res) => {
    const wallet = await prisma.wallet.findUnique(
        {where: {userId: req.userId}}
    );
    if(!wallet) return res.status(409).json({error: "No wallet found"});

    res.json(wallet);
});

//top up
router.post("/topup", async(req, res) => {
    
    const topUpSchema = z.object({
        amount: z.number().positive("Amount must be greater than zero")
    });
    
    const result = topUpSchema.safeParse(req.body);
    if(!result.success) return res.status(400).json({error: result.error.errors});

    const { amount } = result.data;
    
})

export default router;