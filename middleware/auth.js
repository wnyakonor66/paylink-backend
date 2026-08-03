import {verifyAccessToken} from "../utils/token.js";

export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if(!token) return res.status(401).json({error: "No token provided"});

    try {
        const payload = verifyAccessToken(token);
        req.userId = payload.sub;
        next();
    } catch (error) {
        res.status(401).json({error: "Invalid or token expired "})
    }
}