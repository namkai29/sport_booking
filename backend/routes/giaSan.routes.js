const express = require("express");
const router = express.Router();

const controller = require("../controllers/giaSan.controller");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/role.middleware");

// BULK SET GIÁ
router.post("/bulk", auth, role(["ChuSan"]), controller.createBulkGia);

// GET GIÁ THEO SÂN
router.get("/:sanId", controller.getGiaBySan);

// UPDATE
router.put("/:id", auth, role(["ChuSan"]), controller.updateGia);


// DELETE ALL PRICES FOR A COURT TIME SLOT
router.delete("/san/:sanId/khung-gio/:khungGioId", auth, role(["ChuSan"]), controller.deleteGiaBySanKhung);

// DELETE
router.delete("/:id", auth, role(["ChuSan"]), controller.deleteGia);

module.exports = router;