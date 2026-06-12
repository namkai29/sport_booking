const express = require("express");
const router = express.Router();

const controller = require("../controllers/lichSan.controller");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/role.middleware");
const db = require("../config/db");

router.get("/ds-khung-gio", async (req, res) => {
    try {
        const { sanId } = req.query;
        if (sanId) {
            const Model = require("../models/lichSan.model");
            const slots = await Model.getKhungGioBySan(sanId);
            return res.json(slots);
        }
        const [rows] = await db.execute(
            "SELECT * FROM KhungGio WHERE sanId IS NULL ORDER BY gioBatDau ASC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Lỗi lấy khung giờ:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi lấy khung giờ" });
    }
});

router.get("/khung-gio/:sanId", controller.getKhungGioBySan);
router.post("/khung-gio/:sanId", auth, role(["ChuSan"]), controller.addKhungGioSan);
router.post("/khung-gio/:sanId/copy-default", auth, role(["ChuSan"]), controller.copyDefaultKhungGio);
router.delete("/khung-gio/:sanId/:khungGioId", auth, role(["ChuSan"]), controller.deleteKhungGioSan);

router.post("/bulk", auth, role(["ChuSan"]), controller.createBulk);

router.get("/:sanId", controller.getBySan);

router.put("/:id", auth, role(["ChuSan"]), controller.updateTrangThai);

router.delete("/:id", auth, role(["ChuSan"]), controller.deleteLich);

module.exports = router;
