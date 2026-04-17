const express = require("express");
const db = require("./config/db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const routes = require("./routes/index.routes");
const authRoutes = require("./routes/authRoutes");
const sanRoutes = require("./routes/sanRoutes");
<<<<<<< HEAD
const giaRoutes = require("./routes/giaSan.Routes");
const lichRoutes = require("./routes/lichSan.Routes");

=======
const giaRoutes = require("./routes/giaSan.routes");
const lichRoutes = require("./routes/lichSan.routes");
>>>>>>> d4d5ad336d74c0a6fc9860a60329259d62eeab7b
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", routes);

// 👉 Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// 👉 API
app.use("/api/auth", authRoutes);
app.use("/api/san", sanRoutes); //san
app.use("/api/gia-san", giaRoutes); //gia san
app.use("/api/lich-san", lichRoutes); //lịch snâ
<<<<<<< HEAD
//👉 Trang mặc định (login)
=======

// 👉 Trang mặc định (login)
>>>>>>> d4d5ad336d74c0a6fc9860a60329259d62eeab7b
app.get("/", (req, res) => {
  res.send("API is running...");
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
