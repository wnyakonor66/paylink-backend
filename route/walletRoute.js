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
    const wallet = await prisma.wallet.findUnique({where: {userId: req.userId}});
    if(!wallet) return res.status(400).json({error: "Wallet not found"});
    
    const [updatedWallet, transaction] = await prisma.$transaction([
        prisma.wallet.update({
            where: {id: wallet.id},
            data: {balance: {increment: amount}}
        }),
        prisma.transaction.create({
            data: {
                walletId: wallet.id,
                type: "topup",
                amount,
                counterparty: "Mobile Money",
                status: "completed",
            }
        })
    ]);
    res.status(201).json({wallet: updatedWallet, transaction})
    
});

//send
router.post("/send", async (req, res) => {
    const sendSchema = z.object({
        recipientEmail: z.string().email(),
        amount: z.number().positive("Amount must be greater than zero")
    });

    const result = sendSchema.safeParse(req.body);
    if(!result.success) return res.status(400).json({error: result.error.errors});

    const {recipientEmail, amount} = result.data;

    const senderWallet = await prisma.wallet.findUnique({
        where: {userId: req.userId}
    });
    if(!senderWallet) return res.status(400).json({error: "Account cannot be found"});
    
    const recipient = await prisma.user.findUnique(
        {where: {email: recipientEmail},
        include: {wallet: true}
    });
    if(!recipient || !recipient.wallet) return res.status(400).json({error: "Recipient not found"});

    if(Number(senderWallet.balance < amount)) return res.status(400).json({error: "Insufficient funds"});

    const [updatedSenderWallet] = await prisma.$transaction([
        prisma.wallet.update({
            where: {id: senderWallet.id},
            data:  {balance: {decrement: amount}}
        }),
        prisma.wallet.update({
            where: {id: recipient.wallet.id},
            data: {balance: {increment: amount}}
        }),
        prisma.transaction.create({
            data: {
                walletId: senderWallet.id,
                type: 'send', 
                amount, 
                counterparty: recipientEmail
            }
        }),
        prisma.transaction.create({
            data: {
                walletId: recipient.wallet.id,
                type: 'receive', 
                amount, 
                counterparty: req.userId
            }
        })     
    ]);
    res.status(201).json({wallet: updatedSenderWallet})

})

export default router;