import express from "express";


const app = express();
const PORT = 3030;

app.get("/", (req, res) => (
    res.json("Hello")
));


app.listen(PORT, () => {
    console.log(`Server is running on PORT${PORT}`)
})