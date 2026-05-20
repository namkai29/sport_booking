const crypto = require("crypto");
const db = require("../config/db");

const ONLINE_METHODS = new Set(["demo_online", "bank_transfer", "momo"]);

exports.startOnlinePayment = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;

    try {
        await connection.beginTransaction();

        const { datSanId } = req.params;
        const { phuongThuc = "demo_online" } = req.body;

        if (!ONLINE_METHODS.has(phuongThuc)) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Phương thức thanh toán online không hợp lệ" });
        }

        const [bookings] = await connection.execute(
            `SELECT ds.datSanId, ds.nguoiDungId, ds.tongTien, ds.trangThai, tt.trangThaiTT
             FROM DatSan ds
             LEFT JOIN ThanhToan tt ON ds.datSanId = tt.datSanId
             WHERE ds.datSanId = ? AND ds.nguoiDungId = ?
             FOR UPDATE`,
            [datSanId, req.user.id]
        );

        if (bookings.length === 0) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
        }

        const booking = bookings[0];
        if (booking.trangThai === "da_huy") {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Không thể thanh toán đơn đã hủy" });
        }

        if (booking.trangThaiTT === "da_thanh_toan") {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Đơn này đã thanh toán" });
        }

        const maGiaoDich = `DEMO-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
        await connection.execute(
            `UPDATE ThanhToan
             SET phuongThuc = ?, trangThaiTT = 'cho_thanh_toan', maGiaoDich = ?, ngayTT = NULL
             WHERE datSanId = ?`,
            [phuongThuc, maGiaoDich, datSanId]
        );

        await connection.commit();
        shouldRollback = false;
        res.json({
            message: "Đã tạo phiên thanh toán online",
            payment: {
                datSanId: Number(datSanId),
                soTien: Number(booking.tongTien || 0),
                phuongThuc,
                trangThaiTT: "cho_thanh_toan",
                maGiaoDich,
                demoCheckoutUrl: `/frontend/history.html?bookingId=${datSanId}&payment=${maGiaoDich}`
            }
        });
    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        res.status(500).json({ message: "Lỗi tạo thanh toán online" });
    } finally {
        connection.release();
    }
};

exports.confirmOnlinePayment = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;

    try {
        await connection.beginTransaction();

        const { datSanId } = req.params;
        const { maGiaoDich } = req.body;
        const [payments] = await connection.execute(
            `SELECT tt.thanhToanId, tt.maGiaoDich, tt.trangThaiTT, ds.trangThai
             FROM ThanhToan tt
             JOIN DatSan ds ON tt.datSanId = ds.datSanId
             WHERE tt.datSanId = ? AND tt.nguoiDungId = ?
             FOR UPDATE`,
            [datSanId, req.user.id]
        );

        if (payments.length === 0) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(404).json({ message: "Không tìm thấy thanh toán" });
        }

        const payment = payments[0];
        if (payment.trangThai === "da_huy") {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Không thể thanh toán đơn đã hủy" });
        }

        if (payment.trangThaiTT === "da_thanh_toan") {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Đơn này đã thanh toán" });
        }

        if (payment.maGiaoDich && maGiaoDich && payment.maGiaoDich !== maGiaoDich) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Mã giao dịch không khớp" });
        }

        await connection.execute(
            `UPDATE ThanhToan
             SET trangThaiTT = 'da_thanh_toan', phuongThuc = COALESCE(phuongThuc, 'demo_online'), ngayTT = NOW()
             WHERE thanhToanId = ?`,
            [payment.thanhToanId]
        );

        await connection.commit();
        shouldRollback = false;
        res.json({ message: "Thanh toán online thành công", trangThaiTT: "da_thanh_toan" });
    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        res.status(500).json({ message: "Lỗi xác nhận thanh toán online" });
    } finally {
        connection.release();
    }
};
