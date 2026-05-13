require("./config/env");
const express = require("express");
const cors = require("cors");
const path = require("path");


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
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});