const express = require("express");
const db = require("./config/db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();


// ==========================================
// Đảm bảo tên file trong thư mục routes khớp với tên dưới đây
const authRoutes = require("./routes/authRoutes");
const sanRoutes = require("./routes/sanRoutes");
const giaRoutes = require("./routes/giaSan.routes");   //giasan
const lichRoutes = require("./routes/lichSan.routes"); // lịch sn
const datSanRouter = require("./routes/datSan.routes");


const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// 2. ĐĂNG KÝ CÁC MIDDLEWARE & ROUTES
// ==========================================



// Cấu hình các API chi tiết
app.use("/api/auth", authRoutes);
app.use("/api/san", sanRoutes);
app.use("/api/gia-san", giaRoutes);
app.use("/api/lich-san", lichRoutes);
app.use("/api/bookings", datSanRouter);

// Phục vụ các file tĩnh từ thư mục frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Trang mặc định
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Test kết nối DB
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