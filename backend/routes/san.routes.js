const express = require("express")
const router = express.Router()

const sanController = require("../controllers/san.controller")

const { verifyToken } = require("../middleware/authMiddleware")
const { isOwner } = require("../middleware/role.middleware")

router.get("/", sanController.getAllSan)

router.get("/owner", verifyToken, isOwner, sanController.getSanByOwner)

router.post("/", verifyToken, isOwner, sanController.createSan)

router.put("/:id", verifyToken, isOwner, sanController.updateSan)

router.delete("/:id", verifyToken, isOwner, sanController.deleteSan)

module.exports = router