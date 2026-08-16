import express from "express";
import {requireAuth} from "../middleware/auth.js";
import prisma from "../prisma/client.js";

const router = express.Router();

router.use(requireAuth);

router.get("/my-code", async(req, res) => {
    const user = await prisma.user.findUnique({where: {id: req.userId}});
    if(!user) return res.status(404).json({error: "User cannot be found"});

    const payload = {
        type: "PAYLINK-QR",
        recipientEmail: user.email,
        generatedAt: new Date().toISOString()
    };

    res.status(200).json({payload: JSON.stringify(payload)});
});


router.post("/decode", async(req, res) => {
    const {payload} = req.body;

    if(!payload) return res.status(400).json({error: "Payload is required"});

    try {
        const decoded = JSON.parse(payload);

        if (decoded.type !== "PAYLINK-QR" || !decoded.recipientEmail) {
            return res.status(422).json({error: "Unrecognized QR payload"});
        }  
        res.status(200).json({
            recipientEmail: decoded.recipientEmail
        });

    } catch (error) {
        return res.status(422).json({error: "Malfunctioned QR Code payload"});
    }
})

export default router;