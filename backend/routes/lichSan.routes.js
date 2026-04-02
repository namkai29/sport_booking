const express = require("express");
const router = express.Router();

const controller = require("../controllers/lichSan.controller");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/role.middleware");

// BULK CREATE
router.post("/bulk", auth, role("ChuSan"), controller.createBulk);

// GET
router.get("/:sanId", controller.getBySan);

// UPDATE
router.put("/:id", auth, role("ChuSan"), controller.updateTrangThai);

// DELETE
router.delete("/:id", auth, role("ChuSan"), controller.deleteLich);

module.exports = router;