
const db = require("../config/db");
 
const normalizeRating = (value) => {
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
};
 
exports.getCourtReviews = async (req, res) => {
    try {
        const { sanId } = req.params;
        const [summaryRows] = await db.execute(
            `SELECT
                COUNT(*) AS tongDanhGia,
                COALESCE(ROUND(AVG(soSao), 1), 0) AS diemTrungBinh
             FROM DanhGia
             WHERE sanId = ?`,
            [sanId]
        );
        const [reviews] = await db.execute(
            `SELECT
                dg.danhGiaId,
                dg.soSao,
                dg.noiDung,
                DATE_FORMAT(dg.ngayDG, '%Y-%m-%d %H:%i:%s') AS ngayDG,
                nd.ten AS tenKhach,
                DATE_FORMAT(ds.ngayDat, '%Y-%m-%d') AS ngayDat,
                kg.gioBatDau,
                kg.gioKetThuc
             FROM DanhGia dg
             JOIN NguoiDung nd ON dg.nguoiDungId = nd.nguoiDungId
             JOIN DatSan ds ON dg.datSanId = ds.datSanId
             JOIN KhungGio kg ON ds.khungGioId = kg.khungGioId
             WHERE dg.sanId = ?
             ORDER BY dg.ngayDG DESC`,
            [sanId]
        );
 
        res.json({
            summary: {
                tongDanhGia: Number(summaryRows[0].tongDanhGia || 0),
                diemTrungBinh: Number(summaryRows[0].diemTrungBinh || 0)
            },
            reviews
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi tải đánh giá sân" });
    }
};
 
exports.getMyReviewEligibility = async (req, res) => {
    try {
        const { sanId } = req.params;
        const [bookings] = await db.execute(
            `SELECT
                ds.datSanId,
                DATE_FORMAT(ds.ngayDat, '%Y-%m-%d') AS ngayDat,
                kg.gioBatDau,
                kg.gioKetThuc,
                dg.danhGiaId
             FROM DatSan ds
             JOIN KhungGio kg ON ds.khungGioId = kg.khungGioId
             LEFT JOIN DanhGia dg ON dg.datSanId = ds.datSanId AND dg.nguoiDungId = ds.nguoiDungId
             WHERE ds.sanId = ?
                AND ds.nguoiDungId = ?
                AND ds.trangThai IN ('da_xac_nhan', 'hoan_thanh')
             ORDER BY ds.ngayDat DESC, kg.gioBatDau DESC`,
            [sanId, req.user.id]
        );
 
        const availableBooking = bookings.find(booking => !booking.danhGiaId);
        res.json({
            canReview: Boolean(availableBooking),
            reviewedCount: bookings.filter(booking => booking.danhGiaId).length,
            booking: availableBooking || null
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi kiểm tra quyền đánh giá" });
    }
};
 
exports.createReview = async (req, res) => {
    try {
        const { sanId } = req.params;
        const { datSanId, soSao, noiDung } = req.body;
        const rating = normalizeRating(soSao);
        const content = String(noiDung || "").trim();
 
        if (!datSanId || !rating) {
            return res.status(400).json({ message: "Vui lòng chọn đơn đã đặt và số sao hợp lệ" });
        }
 
        if (content.length > 1000) {
            return res.status(400).json({ message: "Nội dung đánh giá tối đa 1000 ký tự" });
        }
 
        const [bookingRows] = await db.execute(
            `SELECT datSanId
             FROM DatSan
             WHERE datSanId = ?
                AND sanId = ?
                AND nguoiDungId = ?
                AND trangThai IN ('da_xac_nhan', 'hoan_thanh')`,
            [datSanId, sanId, req.user.id]
        );
 
        if (bookingRows.length === 0) {
            return res.status(403).json({ message: "Chỉ khách đã đặt sân mới được đánh giá" });
        }
 
        await db.execute(
            `INSERT INTO DanhGia (nguoiDungId, sanId, datSanId, soSao, noiDung)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, sanId, datSanId, rating, content || null]
        );
 
        res.status(201).json({ message: "Cảm ơn bạn đã đánh giá sân" });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Đơn đặt sân này đã được đánh giá" });
        }
        res.status(500).json({ message: "Lỗi gửi đánh giá sân" });
    }
};
