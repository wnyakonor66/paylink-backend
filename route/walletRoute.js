import express from "express";
import {requireAuth} from "../middleware/auth.js";
import prisma from "../prisma/client.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async(req, res) => {
    const wallet = await prisma.wallet.findUnique(
        {where: {userId: req.userId}}
    );
    if(!wallet) return res.status(409).json({error: "No wallet found"});

    res.json(wallet);
})

export default router;