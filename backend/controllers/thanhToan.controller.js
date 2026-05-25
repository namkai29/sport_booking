
const db = require("../config/db");
const vnpayService = require("../services/vnpay.service");
const { calcDepositAmount, calcRemainAtCourt, DEPOSIT_RATE } = require("../utils/payment.util");

async function loadUserBooking(connection, datSanId, userId) {
    const [bookings] = await connection.execute(
        `SELECT ds.datSanId, ds.nguoiDungId, ds.tongTien, ds.trangThai,
                tt.thanhToanId, tt.trangThaiTT, tt.phuongThuc, tt.maGiaoDich, tt.soTien
         FROM DatSan ds
         LEFT JOIN ThanhToan tt ON ds.datSanId = tt.datSanId
         WHERE ds.datSanId = ? AND ds.nguoiDungId = ?
         FOR UPDATE`,
        [datSanId, userId]
    );
    return bookings[0] || null;
}

function getDepositAmount(booking) {
    const stored = Number(booking.soTien);
    if (booking.phuongThuc === "vnpay" && stored > 0) {
        return stored;
    }
    return calcDepositAmount(booking.tongTien);
}

async function markDepositPaid(datSanId, maGiaoDich) {
    const [result] = await db.execute(
        `UPDATE ThanhToan
         SET trangThaiTT = 'da_thanh_toan', phuongThuc = 'vnpay',
             maGiaoDich = COALESCE(?, maGiaoDich), ngayTT = NOW()
         WHERE datSanId = ? AND trangThaiTT != 'da_thanh_toan'`,
        [maGiaoDich || null, datSanId]
    );
    await db.execute(
        `UPDATE DatSan
         SET trangThai = 'da_xac_nhan'
         WHERE datSanId = ? AND trangThai = 'cho_xac_nhan'`,
        [datSanId]
    );
    return result.affectedRows > 0;
}

function getClientIp(req) {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "127.0.0.1"
    );
}

exports.onlineAvailable = (req, res) => {
    const vnpayOk = vnpayService.isConfigured();
    res.json({
        vnpay: {
            available: vnpayOk,
            message: vnpayOk ? "VNPay đã sẵn sàng" : vnpayService.getUnavailableMessage(),
        },
        default: vnpayOk ? "vnpay" : null,
        anyAvailable: vnpayOk,
        depositRate: DEPOSIT_RATE,
    });
};

exports.vnpayAvailable = (req, res) => {
    res.json({
        available: vnpayService.isConfigured(),
        message: vnpayService.isConfigured()
            ? "VNPay đã sẵn sàng"
            : vnpayService.getUnavailableMessage(),
        depositRate: DEPOSIT_RATE,
    });
};

exports.startOnlinePayment = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;

    try {
        await connection.beginTransaction();

        const { datSanId } = req.params;

        if (!vnpayService.isConfigured()) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(503).json({ message: vnpayService.getUnavailableMessage() });
        }

        const booking = await loadUserBooking(connection, datSanId, req.user.id);

        if (!booking) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
        }

        if (booking.trangThai === "da_huy") {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Không thể thanh toán đơn đã hủy" });
        }

        if (booking.trangThaiTT === "da_thanh_toan") {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Đơn này đã cọc online" });
        }

        const tongTien = Number(booking.tongTien || 0);
        const tienCoc = getDepositAmount(booking);

        await connection.execute(
            `UPDATE ThanhToan
             SET phuongThuc = 'vnpay', soTien = ?, trangThaiTT = 'cho_thanh_toan', maGiaoDich = NULL, ngayTT = NULL
             WHERE datSanId = ?`,
            [tienCoc, datSanId]
        );

        const vnpay = vnpayService.createPaymentUrl({
            datSanId,
            amount: tienCoc,
            orderInfo: `Coc 30 phan tram dat san ${datSanId}`,
            ipAddr: getClientIp(req),
        });

        await connection.execute(
            `UPDATE ThanhToan
             SET maGiaoDich = ?
             WHERE datSanId = ?`,
            [vnpay.txnRef, datSanId]
        );

        await connection.commit();
        shouldRollback = false;
        return res.json({
            message: `Thanh toán cọc ${Math.round(DEPOSIT_RATE * 100)}% qua VNPay`,
            payment: {
                datSanId: Number(datSanId),
                tongTien,
                tienCoc,
                conLaiTaiSan: calcRemainAtCourt(tongTien, tienCoc),
                depositRate: DEPOSIT_RATE,
                soTien: vnpay.amount,
                phuongThuc: "vnpay",
                trangThaiTT: "cho_thanh_toan",
                maGiaoDich: vnpay.txnRef,
                payUrl: vnpay.payUrl,
            },
        });
    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        console.error("startOnlinePayment:", err.message);
        res.status(500).json({ message: err.message || "Lỗi tạo thanh toán online" });
    } finally {
        connection.release();
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { datSanId } = req.params;
        const [rows] = await db.execute(
            `SELECT tt.thanhToanId, tt.datSanId, tt.soTien, tt.phuongThuc, tt.maGiaoDich,
                    tt.trangThaiTT, tt.ngayTT, ds.trangThai, ds.tongTien
             FROM ThanhToan tt
             JOIN DatSan ds ON tt.datSanId = ds.datSanId
             WHERE tt.datSanId = ? AND tt.nguoiDungId = ?`,
            [datSanId, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy thanh toán" });
        }

        const payment = rows[0];
        const tongTien = Number(payment.tongTien || 0);
        const tienCoc = getDepositAmount(payment);

        res.json({
            datSanId: Number(payment.datSanId),
            tongTien,
            tienCoc,
            conLaiTaiSan: calcRemainAtCourt(tongTien, tienCoc),
            depositRate: DEPOSIT_RATE,
            soTien: tienCoc,
            phuongThuc: payment.phuongThuc,
            maGiaoDich: payment.maGiaoDich,
            trangThaiTT: payment.trangThaiTT,
            trangThaiDon: payment.trangThai,
            ngayTT: payment.ngayTT,
            paid: payment.trangThaiTT === "da_thanh_toan",
            depositPaid: payment.trangThaiTT === "da_thanh_toan" && payment.phuongThuc === "vnpay",
            autoConfirmed: payment.trangThaiTT === "da_thanh_toan" && payment.trangThai === "da_xac_nhan",
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy trạng thái thanh toán" });
    }
};

exports.vnpayProcessReturn = async (req, res) => {
    try {
        const query = req.query;

        if (!vnpayService.verifySecureHash(query)) {
            return res.status(400).json({ message: "Chữ ký VNPay không hợp lệ" });
        }

        const [rows] = await db.execute(
            `SELECT tt.datSanId, ds.tongTien, tt.soTien
             FROM ThanhToan tt
             JOIN DatSan ds ON tt.datSanId = ds.datSanId
             WHERE tt.maGiaoDich = ? AND ds.nguoiDungId = ?`,
            [query.vnp_TxnRef, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn thanh toán" });
        }

        const row = rows[0];
        const success = vnpayService.isPaymentSuccess(query);

        if (success) {
            await markDepositPaid(row.datSanId, query.vnp_TxnRef);
        }

        const tongTien = Number(row.tongTien || 0);
        const tienCoc = Number(row.soTien || 0);

        res.json({
            datSanId: Number(row.datSanId),
            success,
            tongTien,
            tienCoc,
            conLaiTaiSan: calcRemainAtCourt(tongTien, tienCoc),
            responseCode: query.vnp_ResponseCode,
            message: success
                ? "Đã cọc online 30% thành công. Đơn đã được tự động xác nhận."
                : (query.vnp_Message || "Thanh toán chưa thành công"),
        });
    } catch (err) {
        console.error("vnpayProcessReturn:", err.message);
        res.status(500).json({ message: "Lỗi xử lý kết quả VNPay" });
    }
};

exports.vnpayIpn = async (req, res) => {
    try {
        const query = req.query;

        if (!vnpayService.verifySecureHash(query)) {
            console.error("vnpayIpn: invalid signature");
            return res.status(400).json({ RspCode: "97", Message: "Invalid signature" });
        }

        const [rows] = await db.execute(
            "SELECT datSanId FROM ThanhToan WHERE maGiaoDich = ?",
            [query.vnp_TxnRef]
        );

        if (rows.length === 0) {
            return res.status(200).json({ RspCode: "01", Message: "Order not found" });
        }

        if (vnpayService.isPaymentSuccess(query)) {
            await markDepositPaid(rows[0].datSanId, query.vnp_TxnRef);
            return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
        }

        return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
    } catch (err) {
        console.error("vnpayIpn:", err.message);
        return res.status(500).json({ RspCode: "99", Message: "Unknown error" });
    }
};
