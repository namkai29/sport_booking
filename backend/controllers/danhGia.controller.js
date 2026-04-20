const db = require("../config/db");

// ======================
// CREATE REVIEW
// ======================
exports.createDanhGia = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { sanId, soSao, noiDung } = req.body;
    const nguoiDungId = req.user.id;

    // 1. Validate
    if (!sanId || !soSao) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    if (soSao < 1 || soSao > 5) {
      return res.status(400).json({ message: "Số sao phải từ 1 đến 5" });
    }

    // 2. Check user đã từng đặt sân chưa (chỉ cho đánh giá khi đã chơi)
    const [booking] = await connection.execute(
      `SELECT * FROM DatSan
             WHERE nguoiDungId = ? 
             AND sanId = ?
             AND trangThai IN ('cho_xac_nhan','da_xac_nhan','hoan_thanh')`,
      [nguoiDungId, sanId],
    );

    if (!booking.length) {
      return res.status(403).json({
        message: "Bạn chưa từng đặt sân này nên không thể đánh giá",
      });
    }

    // 3. (OPTIONAL) Check đã đánh giá chưa → tránh spam
    const [exist] = await connection.execute(
      `SELECT * FROM DanhGia 
             WHERE nguoiDungId = ? AND sanId = ?`,
      [nguoiDungId, sanId],
    );

    if (exist.length) {
      return res.status(400).json({
        message: "Bạn đã đánh giá sân này rồi",
      });
    }

    // 4. Insert
    await connection.execute(
      `INSERT INTO DanhGia (nguoiDungId, sanId, soSao, noiDung)
             VALUES (?, ?, ?, ?)`,
      [nguoiDungId, sanId, soSao, noiDung || null],
    );

    await connection.commit();

    res.json({ message: "Đánh giá thành công" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Lỗi hệ thống" });
  } finally {
    connection.release();
  }
};
exports.getDanhGiaBySan = async (req, res) => {
  try {
    const { sanId } = req.params;

    const [rows] = await db.execute(
      `SELECT 
                d.danhGiaId,
                d.soSao,
                d.noiDung,
                DATE_FORMAT(d.ngayDG, '%Y-%m-%d %H:%i') as ngayDG,
                u.ten
             FROM DanhGia d
             JOIN NguoiDung u ON d.nguoiDungId = u.nguoiDungId
             WHERE d.sanId = ?
             ORDER BY d.ngayDG DESC`,
      [sanId],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
