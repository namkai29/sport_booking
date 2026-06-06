const path = require("path");
const db = require("../config/db");
const Model = require("../models/datSan.model");
const { calcDepositAmount, calcRemainAtCourt, DEPOSIT_RATE } = require("../utils/payment.util");


const publicCourtUploadPrefix = "/uploads/courts/";
 
const normalizeCourtImagePath = (imagePath) => {
    const value = String(imagePath || "").trim().replace(/\\/g, "/");
    if (!value) return "";
 
    const uploadIndex = value.indexOf(publicCourtUploadPrefix);
    if (uploadIndex >= 0) {
        const filename = path.posix.basename(value.slice(uploadIndex + publicCourtUploadPrefix.length));
        return filename ? `${publicCourtUploadPrefix}${filename}` : "";
    }
 
    if (value.startsWith("uploads/courts/")) {
        const filename = path.posix.basename(value.slice("uploads/courts/".length));
        return filename ? `${publicCourtUploadPrefix}${filename}` : "";
    }
 
    return "";
};
 
const normalizeCourt = (court) => ({
    ...court,
    hinhAnh: normalizeCourtImagePath(court.hinhAnh || court.hinhANH)
});

const toNumber = (value) => Number(value || 0);

const getVietnamNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));

const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const isSameDate = (date, dateKey) => getDateKey(date) === dateKey;

const isPastSlot = (bookingDate, gioBatDau) => {
    if (!isSameDate(bookingDate, getDateKey(getVietnamNow()))) {
        return false;
    }

    const [hour = 0, minute = 0, second = 0] = String(gioBatDau || "00:00:00").split(":").map(Number);
    const slotStart = new Date(bookingDate);
    slotStart.setHours(hour, minute, second, 0);

    return slotStart <= getVietnamNow();
};

const buildSearchSanFilters = (query = {}) => {
    const { loaiSanId, tinhThanh, tenSan } = query;
    let whereClause = " WHERE s.tinhTrang = 'HoatDong'";
    const params = [];

    if (loaiSanId) {
        whereClause += " AND s.loaiSanId = ?";
        params.push(loaiSanId);
    }
    if (tinhThanh) {
        whereClause += " AND d.tinhThanh LIKE ?";
        params.push(`%${tinhThanh}%`);
    }
    if (tenSan) {
        whereClause += " AND s.tenSan LIKE ?";
        params.push(`%${tenSan}%`);
    }

    return { whereClause, params };
};

//tim san :theo loại sân ,tỉnh,tên
exports.searchSan = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));
        const offset = (page - 1) * limit;
        const { whereClause, params } = buildSearchSanFilters(req.query);

        const baseFrom = `
            FROM San s
            JOIN LoaiSan l ON s.loaiSanId = l.loaiSanId
            JOIN DiaChi d ON s.diaChiId = d.diaChiId
        `;

        const countQuery = `SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`;
        const dataQuery = `
            SELECT
                s.sanId,
                s.chuSanId,
                s.loaiSanId,
                s.diaChiId,
                s.tenSan,
                s.moTa,
                s.hinhAnh,
                s.tinhTrang,
                s.ngayTaoSan,
                l.tenLoai,
                d.tinhThanh,
                d.quanHuyen,
                d.phuongXa,
                d.diaChiChiTiet,
                d.viDo,
                d.kinhDo,
                (SELECT COUNT(*) FROM DanhGia dg WHERE dg.sanId = s.sanId) AS tongDanhGia,
                (SELECT COALESCE(ROUND(AVG(dg.soSao), 1), 0) FROM DanhGia dg WHERE dg.sanId = s.sanId) AS diemTrungBinh,
                (SELECT MIN(gs.gia) FROM GiaSan gs WHERE gs.sanId = s.sanId AND gs.gia > 0) AS giaTu
            ${baseFrom}
            ${whereClause}
            ORDER BY s.ngayTaoSan DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [[countRow]] = await db.execute(countQuery, params);
        const total = Number(countRow?.total || 0);
        const [rows] = await db.execute(dataQuery, params);

        res.json({
            courts: rows.map(normalizeCourt),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (err) {
        console.error("searchSan error:", err);
        res.status(500).json({ message: "Lỗi tìm kiếm" });
    }
};
//lấy thông tin 1 sân để xem chi tiết sân
exports.getSanDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT
                s.sanId,
                s.chuSanId,
                s.loaiSanId,
                s.diaChiId,
                s.tenSan,
                s.moTa,
                s.hinhAnh,
                s.tinhTrang,
                s.ngayTaoSan,
                l.tenLoai,
                d.tinhThanh,
                d.quanHuyen,
                d.phuongXa,
                d.diaChiChiTiet,
                d.viDo,
                d.kinhDo,
                (SELECT COUNT(*) FROM DanhGia dg WHERE dg.sanId = s.sanId) AS tongDanhGia,
                (SELECT COALESCE(ROUND(AVG(dg.soSao), 1), 0) FROM DanhGia dg WHERE dg.sanId = s.sanId) AS diemTrungBinh
            FROM San s
            JOIN LoaiSan l ON s.loaiSanId = l.loaiSanId
            LEFT JOIN DiaChi d ON s.diaChiId = d.diaChiId
            WHERE s.sanId = ?
        `;
        const [rows] = await db.execute(query, [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy sân" });
        res.json(normalizeCourt(rows[0]));
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy thông tin sân" });
    }
};

// hiện ma traanj khung giờ
exports.checkAvailableSlots = async (req, res) => {
    const { sanId, ngay } = req.query;
    const ngayDate = new Date(ngay);
 
    if (!sanId || Number.isNaN(ngayDate.getTime())) {
        return res.status(400).json({ message: "Dữ liệu kiểm tra lịch không hợp lệ" });
    }
 
    const thuInSql = ngayDate.getDay() === 0 ? 8 : ngayDate.getDay() + 1;

    try {
        const query = `

            SELECT
                kg.khungGioId,
                kg.gioBatDau,
                kg.gioKetThuc,
                gs.gia,
                ls.trangThai AS lichChuSan,
            (SELECT COUNT(*) FROM DatSan ds
                 WHERE ds.sanId = ? AND ds.ngayDat = ? AND ds.khungGioId = kg.khungGioId
                 AND ds.trangThai IN ('cho_xac_nhan', 'da_xac_nhan', 'hoan_thanh')) AS daDat
            FROM KhungGio kg
            LEFT JOIN GiaSan gs ON kg.khungGioId = gs.khungGioId AND gs.sanId = ? AND gs.thuTrongTuan = ?
            LEFT JOIN LichSan ls ON kg.khungGioId = ls.khungGioId AND ls.sanId = ? AND ls.ngay = ?
            ORDER BY kg.gioBatDau ASC
        `;

        const [slots] = await db.execute(query, [sanId, ngay, sanId, thuInSql, sanId, ngay]);
        
        // Map lại dữ liệu để Frontend dễ hiển thị màu sắc (Xanh: Trống, Đỏ: Hết, Xám: Đóng)
        const result = slots.map(slot => {
            let status = 'Closed';
            if (slot.daDat > 0) {
                status = 'Full';
            } else if (isPastSlot(ngayDate, slot.gioBatDau)) {
                status = 'Past';
            } else if (slot.lichChuSan === 'Mo' && slot.gia !== null) {
                status = 'Available';
            } else if (slot.lichChuSan === 'Mo') {
                status = 'NoPrice';
            }
 
            return {
                ...slot,
                status,
                finalPrice: slot.gia || 0
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Lỗi tải lịch sân" });
    }
};

exports.createBooking = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;
    try {
        await connection.beginTransaction();

        const { sanId, ngayDat, khungGioId, phuongThucThanhToan } = req.body;
        const nguoiDungId = req.user.id;
        const paymentMethod = phuongThucThanhToan === "vnpay" ? "vnpay" : "tai_san";
         if (!sanId || !ngayDat || !khungGioId) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Thiếu thông tin đặt sân" });
        }
        // BƯỚC 1: Validate ngày (Không đặt ngày quá khứ)
        const ngayDatDate = new Date(ngayDat);
         if (Number.isNaN(ngayDatDate.getTime())) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Ngày đặt không hợp lệ" });
        }
 
        if (ngayDatDate < new Date().setHours(0, 0, 0, 0)) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Không thể đặt sân cho ngày đã qua" });
        }

        const [slotRows] = await connection.execute(
            "SELECT gioBatDau FROM KhungGio WHERE khungGioId = ?",
            [khungGioId]
        );
        if (slotRows.length === 0) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(404).json({ message: "Không tìm thấy khung giờ" });
        }

        if (isPastSlot(ngayDatDate, slotRows[0].gioBatDau)) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Không thể đặt khung giờ đã qua trong hôm nay" });
        }
        

        const [sanRows] = await connection.execute(
            "SELECT sanId FROM San WHERE sanId = ? AND tinhTrang = 'HoatDong' FOR UPDATE",
            [sanId]
        );
        if (sanRows.length === 0) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(404).json({ message: "Không tìm thấy sân đang hoạt động" });
        }

        // BƯỚC 2: Check trạng thái mở cửa (LichSan)
        const isMo = await Model.checkSanSang(sanId, ngayDat, khungGioId);
        if (!isMo) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Sân hiện không mở cửa vào khung giờ này" });
        }

        // BƯỚC 3: Check trùng lịch (Tránh Race Condition sơ cấp)
        const [activeBookings] = await connection.execute(
            `SELECT datSanId FROM DatSan
             WHERE sanId = ? AND ngayDat = ? AND khungGioId = ?
             AND trangThai IN ('cho_xac_nhan', 'da_xac_nhan', 'hoan_thanh')`,
            [sanId, ngayDat, khungGioId]
        );
        if (activeBookings.length > 0) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Rất tiếc, khung giờ này vừa có người đặt" });
        }

        // BƯỚC 4: Tính toán giá tiền
        // Chuyển đổi JS Day (0-6) sang định dạng của bạn (2-8)
        const jsDay = ngayDatDate.getDay(); // 0: CN, 1: T2...
        const thuTrongTuan = jsDay === 0 ? 8 : jsDay + 1;

        const tongTien = await Model.getGiaTien(sanId, khungGioId, thuTrongTuan);
        if (!tongTien) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Chưa cấu hình giá cho khung giờ này" });
        }

        // BƯỚC 5: Tạo đơn đặt sân
        const [resDatSan] = await connection.execute(
            `INSERT INTO DatSan (nguoiDungId, sanId, khungGioId, ngayDat, tongTien, trangThai)
             VALUES (?, ?, ?, ?, ?, 'cho_xac_nhan')`,
            [nguoiDungId, sanId, khungGioId, ngayDat, tongTien]
        );

        const datSanId = resDatSan.insertId;
        const tienCoc = paymentMethod === "vnpay" ? calcDepositAmount(tongTien) : tongTien;

        // BƯỚC 6: Tạo bản ghi thanh toán (VNPay: chỉ lưu số tiền cọc 30%)
        await connection.execute(
             `INSERT INTO ThanhToan (datSanId, nguoiDungId, soTien, phuongThuc, trangThaiTT)
             VALUES (?, ?, ?, ?, 'chua_thanh_toan')`,
            [datSanId, nguoiDungId, tienCoc, paymentMethod]
        );

        await connection.commit();
        shouldRollback = false;
         res.status(201).json({
            message: paymentMethod === "vnpay"
                ? "Đặt sân thành công! Vui lòng cọc 30% online qua VNPay."
                : "Đặt sân thành công! Vui lòng chờ xác nhận.",
            datSanId,
            trangThai: "cho_xac_nhan",
            tongTien,
            tienCoc: paymentMethod === "vnpay" ? tienCoc : undefined,
            conLaiTaiSan: paymentMethod === "vnpay" ? calcRemainAtCourt(tongTien, tienCoc) : undefined,
            depositRate: paymentMethod === "vnpay" ? DEPOSIT_RATE : undefined,
        });

    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        console.error(err);
        res.status(500).json({ message: "Lỗi hệ thống khi đặt sân" });
    } finally {
        connection.release();
    }
};
exports.getBookingDetail = async (req, res) => {
    try {
        const booking = await Model.getBookingDetailByUser(req.params.id, req.user.id);
        if (!booking) {
            return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
        }
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy chi tiết đơn đặt sân" });
    }
};
 //lấy lịch đặt sân của khhác
exports.getMyHistory = async (req, res) => {
    try {
        const query = `
             SELECT
                ds.datSanId,
                ds.sanId,
                ds.khungGioId,
                DATE_FORMAT(ds.ngayDat, '%Y-%m-%d') AS ngayDat,
                ds.tongTien,
                ds.trangThai,
                s.tenSan,
                kg.gioBatDau,
                kg.gioKetThuc,
                tt.trangThaiTT,
                tt.phuongThuc,
                tt.soTien,
                tt.maGiaoDich,
                DATE_FORMAT(tt.ngayTT, '%Y-%m-%d %H:%i:%s') AS ngayTT
            FROM DatSan ds
            JOIN San s ON ds.sanId = s.sanId
            JOIN KhungGio kg ON ds.khungGioId = kg.khungGioId
            LEFT JOIN ThanhToan tt ON ds.datSanId = tt.datSanId
            WHERE ds.nguoiDungId = ?
            ORDER BY ds.ngayDat DESC, kg.gioBatDau DESC
        `;
        const [rows] = await db.execute(query, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy lịch sử" });
    }
};

exports.userCancelBooking = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;
 
    try {
        await connection.beginTransaction();
 
        const { id } = req.params;
        const [bookings] = await connection.execute(
            `SELECT datSanId, trangThai
             FROM DatSan
             WHERE datSanId = ? AND nguoiDungId = ?
             FOR UPDATE`,
            [id, req.user.id]
        );
 
        if (bookings.length === 0) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(404).json({ message: "Không tìm thấy đơn đặt sân" });
        }
 
        if (bookings[0].trangThai !== "cho_xac_nhan") {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Chỉ có thể hủy đơn đang chờ xác nhận" });
        }
 
        await connection.execute(
            "UPDATE DatSan SET trangThai = 'da_huy' WHERE datSanId = ?",
            [id]
        );
        await connection.execute(
            "UPDATE ThanhToan SET trangThaiTT = 'chua_thanh_toan' WHERE datSanId = ?",
            [id]
        );
 
        await connection.commit();
        shouldRollback = false;
        res.json({ message: "Hủy đơn đặt sân thành công" });
    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        res.status(500).json({ message: "Lỗi khi hủy đơn đặt sân" });
    } finally {
        connection.release();
    }
};

const buildOwnerBookingSummary = (bookings) => {
    const today = new Date().toISOString().slice(0, 10);
    return bookings.reduce((summary, booking) => {
        const total = toNumber(booking.tongTien);
        const deposit = toNumber(booking.soTien);
        const isCancelled = booking.trangThai === "da_huy";
        const isPaid = booking.trangThaiTT === "da_thanh_toan";

        summary.totalBookings += 1;
        summary.totalRevenue += isCancelled ? 0 : total;
        summary.pendingBookings += booking.trangThai === "cho_xac_nhan" ? 1 : 0;
        summary.confirmedBookings += booking.trangThai === "da_xac_nhan" ? 1 : 0;
        summary.completedBookings += booking.trangThai === "hoan_thanh" ? 1 : 0;
        summary.cancelledBookings += isCancelled ? 1 : 0;
        summary.paidBookings += isPaid ? 1 : 0;
        summary.onlineDepositRevenue += isPaid && booking.phuongThuc === "vnpay" ? deposit : 0;
        summary.revenueToday += !isCancelled && booking.ngayDat === today ? total : 0;
        summary.todayBookings += booking.ngayDat === today ? 1 : 0;
        return summary;
    }, {
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        paidBookings: 0,
        todayBookings: 0,
        revenueToday: 0,
        totalRevenue: 0,
        onlineDepositRevenue: 0,
    });
};

exports.getOwnerBookings = async (req, res) => {
    try {
        const query = `
            SELECT
                ds.datSanId,
                DATE_FORMAT(ds.ngayDat, '%Y-%m-%d') AS ngayDat,
                ds.tongTien,
                ds.trangThai,
                nd.ten AS tenKhach,
                nd.email AS emailKhach,
                s.tenSan,
                kg.gioBatDau,
                kg.gioKetThuc,
                tt.trangThaiTT,
                tt.phuongThuc,
                tt.soTien,
                tt.maGiaoDich,
                DATE_FORMAT(tt.ngayTT, '%Y-%m-%d %H:%i:%s') AS ngayTT,
                CASE
                    WHEN tt.trangThaiTT = 'da_thanh_toan' AND tt.phuongThuc = 'vnpay' THEN 1
                    ELSE 0
                END AS tuDongXacNhan
            FROM DatSan ds
            JOIN NguoiDung nd ON ds.nguoiDungId = nd.nguoiDungId
            JOIN San s ON ds.sanId = s.sanId
            JOIN KhungGio kg ON ds.khungGioId = kg.khungGioId
            LEFT JOIN ThanhToan tt ON ds.datSanId = tt.datSanId
            WHERE s.chuSanId = ?
            ORDER BY ds.ngayDat DESC, kg.gioBatDau DESC
        `;
        const [rows] = await db.execute(query, [req.user.id]);
        res.json({
            bookings: rows,
            summary: buildOwnerBookingSummary(rows),
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách đơn đặt sân" });
    }
};
//chủ sân xác nhận đơn
exports.updateStatus = async (req, res) => {
    const { id } = req.params; // ID của đơn đặt sân
    const { trangThai } = req.body; // 'da_xac_nhan', 'hoan_thanh' hoặc 'da_huy'

     if (!["da_xac_nhan", "hoan_thanh", "da_huy"].includes(trangThai)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }
    try {
        // Kiểm tra xem đơn này có thuộc sân của chủ sân này không
        const [check] = await db.execute(
            `SELECT ds.datSanId, ds.trangThai FROM DatSan ds
             JOIN San s ON ds.sanId = s.sanId
             WHERE ds.datSanId = ? AND s.chuSanId = ?`,
            [id, req.user.id]
        );

        if (check.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền quản lý đơn này" });
        }
        const currentStatus = check[0].trangThai;
        const allowedTransitions = {
            cho_xac_nhan: ["da_xac_nhan", "da_huy"],
            da_xac_nhan: ["hoan_thanh"],
        };

        if (!allowedTransitions[currentStatus]?.includes(trangThai)) {
            return res.status(400).json({ message: "Không thể chuyển trạng thái đơn theo thao tác này" });
        }
        await db.execute("UPDATE DatSan SET trangThai = ? WHERE datSanId = ?", [trangThai, id]);
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi cập nhật trạng thái" });
    }
};