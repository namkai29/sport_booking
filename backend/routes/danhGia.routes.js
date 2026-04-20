const express = require("express");
const router = express.Router();

const controller = require("../controllers/danhGia.controller");
const auth = require("../middleware/authMiddleware");

// tạo đánh giá
router.post("/", auth, controller.createDanhGia);

// lấy đánh giá theo sân
router.get("/san/:sanId", controller.getDanhGiaBySan);

module.exports = router;
