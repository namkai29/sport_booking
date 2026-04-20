const db = require("../config/db");
exports.createBooking = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { sanId, khungGioId, ngayDat } = req.body;
    const nguoiDungId = req.user.id;

    // 1. Validate
    if (!sanId || !khungGioId || !ngayDat) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    // 2. Check ngày
    const today = new Date().toISOString().split("T")[0];
    if (ngayDat < today) {
      return res.status(400).json({ message: "Không thể đặt ngày quá khứ" });
    }

    // 3. Check lịch sân có mở không
    const [lich] = await connection.execute(
      `SELECT * FROM LichSan 
             WHERE sanId=? AND khungGioId=? AND ngay=?`,
      [sanId, khungGioId, ngayDat],
    );

    if (!lich.length || lich[0].trangThai !== "Mo") {
      return res.status(400).json({ message: "Khung giờ không khả dụng" });
    }

    // 4. Check đã có người đặt chưa
    const [exist] = await connection.execute(
      `SELECT * FROM DatSan 
             WHERE sanId=? AND khungGioId=? AND ngayDat=?`,
      [sanId, khungGioId, ngayDat],
    );

    if (exist.length) {
      return res.status(400).json({ message: "Khung giờ đã được đặt" });
    }

    // 5. Tính tiền (ví dụ)
    const tongTien = 100000; // TODO: lấy từ bảng San

    // 6. Insert
    await connection.execute(
      `INSERT INTO DatSan 
            (nguoiDungId, sanId, khungGioId, ngayDat, tongTien)
            VALUES (?, ?, ?, ?, ?)`,
      [nguoiDungId, sanId, khungGioId, ngayDat, tongTien],
    );

    await connection.commit();

    res.json({ message: "Đặt sân thành công" });
  } catch (err) {
    await connection.rollback();

    // handle unique error
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Khung giờ đã được đặt" });
    }

    console.error(err);
    res.status(500).json({ message: "Lỗi hệ thống" });
  } finally {
    connection.release();
  }
};
exports.getMyBookings = async (req, res) => {
  try {
    const nguoiDungId = req.user.id;

    const [rows] = await db.execute(
      `SELECT 
                d.datSanId,
                DATE_FORMAT(d.ngayDat, '%Y-%m-%d') AS ngayDat,
                d.trangThai,
                d.tongTien,
                s.tenSan,
                k.gioBatDau,
                k.gioKetThuc
             FROM DatSan d
             JOIN San s ON d.sanId = s.sanId
             JOIN KhungGio k ON d.khungGioId = k.khungGioId
             WHERE d.nguoiDungId = ?
             ORDER BY d.ngayDat DESC, k.gioBatDau DESC`,
      [nguoiDungId],
    );

    res.json(rows);
  } catch (err) {
    console.error("Lỗi getMyBookings:", err);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
