import express from "express";
import prisma from "../prisma/client.js";
import {requireAuth} from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

//GET ALL TRANSACTIONS TIED TO A WALLET
router.get("/", async(req, res) => {
    
    const wallet = await prisma.wallet.findUnique({
        where: {userId: req.userId}
    });
    if(!wallet) return res.status(400).json({error: "Wallet not found"});

    const transactions = await prisma.transaction.findMany({
        where: {walletId: wallet.id},
        orderBy: {createdAt: 'desc'}
    });
    res.status(200).json({data: transactions})
    
});


export default router;

