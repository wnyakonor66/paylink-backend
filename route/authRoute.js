import express from "express";
import {z} from "zod";
import prisma from "../prisma/client.js";
import bcrypt from "bcrypt";
import { signAccessToken, signRefreshToken } from "../utils/token.js";

const router = express.Router();

//SCHEMA VALIDATOR
const signUpSchema = z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(8, "Password length must be 8 characters")
});

//SIGN UP AUTHENTICATION
router.post("/signup", async (req, res) => {
    const result = signUpSchema.safeParse(req.body);
    if(!result.success) return res.status(400).json({error: result.error.errors});
    
    const {email, password} = result.data;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if(existingUser) return res.status(409).json({error: "Email already exists"});

    const user = await prisma.user.create({
        data: {
            email, 
            password: hashedPassword,
            wallet: { create: {} }
        }
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(201).json({
        user: {id: user.id, email: user.email},
        accessToken,
        refreshToken
    })   

})

export default router;