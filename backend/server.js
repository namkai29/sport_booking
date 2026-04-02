const express = require("express");
const db = require("./config/db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const sanRoutes = require("./routes/sanRoutes");//crud sân
const giaRoutes = require("./routes/giaSan.routes");  //thiết lập giá 
const lichRoutes = require("./routes/lichSan.routes");  //lịch saan



const app = express();

app.use(cors());
app.use(express.json());

// 👉 Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// 👉 API
app.use("/api/auth", authRoutes);
app.use("/api/san", sanRoutes);//san
app.use("/api/gia-san", giaRoutes);  //gia san
app.use("/api/lich-san", lichRoutes);//lịch snâ


// 👉 Trang mặc định (login)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// test
app.get("/users", (req, res) => {
    db.query("SELECT * FROM NguoiDung", (err, result) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.json(result);
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});