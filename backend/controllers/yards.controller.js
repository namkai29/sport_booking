const db = require("../config/db");

const getAllYards = (req, res) => {
  db.query("SELECT * FROM San", (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(result);
  });
};

const searchYards = (req, res) => {
  const { k } = req.query;
  if (!k) {
    return res
      .status(400)
      .json({ error: "Vui lòng cung cấp từ khóa tìm kiếm" });
  }
  db.query(
    "SELECT * FROM San WHERE tenSan LIKE ?",
    [`%${k}%`],
    (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }
      res.json(result);
    },
  );
};
const setYard = (req, res) => {
  const { nguoiDungId, sanId, ngayDat, gioBatDau, gioKetThuc } = req.body;
  db.query(
    "INSERT INTO DatSan (nguoiDungId, sanId, ngayDat, gioBatDau, gioKetThuc) VALUES (?, ?, ?, ?, ?)",
    [nguoiDungId, sanId, ngayDat, gioBatDau, gioKetThuc],
    (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }
      res.json({ message: "Đặt sân thành công", data: result });
    },
  );
};
module.exports = {
  getAllYards,
  searchYards,
  setYard,
};
