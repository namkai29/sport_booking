const express = require("express");
const router = express.Router();
const yardRoutes = require("./yard.routes");
router.use("/yards", yardRoutes);
module.exports = router;
