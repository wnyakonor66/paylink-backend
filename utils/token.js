import jwt from "jsonwebtoken";


//SIGN IN TOKEN
export const signAccessToken = (user) => {
    return jwt.sign (
        {sub: user.id, email: user.email},
        process.env.JWT_ACCESS_SECRET,
        {expiresIn: "15m"}
    )
};


//REFRESH TOKEN
export const signRefreshToken = (user) => {
    return jwt.sign(
        {sub: user.id, type: "refresh"},
        process.env.JWT_REFRESH_SECRET,
        {expiresIn: "7d"}
    )
};


//VERIFY SIGN IN TOKEN
export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET)
};


//VERIFY REFRESH TOKEN
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET)
}