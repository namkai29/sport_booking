const express = require("express");
const router = express.Router();

const controller = require("../controllers/lichSan.controller");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/role.middleware");
const db = require("../config/db"); // 👉 SỬA 1: Khai báo db ở đây để dùng được hàm execute bên dưới

// 👉 SỬA 2: Đẩy cái "ds-khung-gio" lên ĐẦU TIÊN để tránh bị nhầm với :sanId
router.get("/ds-khung-gio", async (req, res) => {
    try {
        // Lấy toàn bộ danh sách khung giờ sắp xếp từ sớm đến muộn
        // Lưu ý: Nếu file db.js của bạn dùng mysql2/promise thì giữ nguyên await db.execute
        // Còn nếu file db.js dùng callback (như file app.js nãy thấy có db.query) thì phải đổi thành db.query nhé!
        const [rows] = await db.execute("SELECT * FROM KhungGio ORDER BY gioBatDau ASC");
        res.json(rows);
    } catch (error) {
        console.error("Lỗi lấy khung giờ:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi lấy khung giờ" });
    }
});

// BULK CREATE
router.post("/bulk", auth, role("ChuSan"), controller.createBulk);

// GET (Đã được hạ xuống dưới để không tranh chấp)
router.get("/:sanId", controller.getBySan);

// UPDATE
router.put("/:id", auth, role("ChuSan"), controller.updateTrangThai);

// DELETE
router.delete("/:id", auth, role("ChuSan"), controller.deleteLich);

module.exports = router;