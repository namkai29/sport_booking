const express = require("express");
const {
  getAllYards,
  searchYards,
  setYard,
} = require("../controllers/yards.controller");

const router = express.Router();

router.get("/", getAllYards);
router.get("/search", searchYards);
router.post("/book", setYard);

module.exports = router;
