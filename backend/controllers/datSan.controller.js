const db = require("../config/db");
const Model = require("../models/datSan.model");

//tim san :theo loại sân ,tỉnh,tên
exports.searchSan = async (req, res) => {
    try {
        const { loaiSanId, tinhThanh, tenSan } = req.query;
        let query = `
            SELECT s.*, l.tenLoai, d.tinhThanh, d.quanHuyen, d.diaChiChiTiet 
            FROM San s
            JOIN LoaiSan l ON s.loaiSanId = l.loaiSanId
            JOIN DiaChi d ON s.diaChiId = d.diaChiId
            WHERE s.tinhTrang = 'HoatDong'
        `;
        const params = [];

        if (loaiSanId) {
            query += " AND s.loaiSanId = ?";
            params.push(loaiSanId);
        }
        if (tinhThanh) {
            query += " AND d.tinhThanh LIKE ?";
            params.push(`%${tinhThanh}%`);
        }
        if (tenSan) {
            query += " AND s.tenSan LIKE ?";
            params.push(`%${tenSan}%`);
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Lỗi tìm kiếm" });
    }
};
//lấy thông tin 1 sân để xem chi tiết sân
exports.getSanDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT s.*, l.tenLoai, d.tinhThanh, d.quanHuyen, d.diaChiChiTiet
            FROM San s
            JOIN LoaiSan l ON s.loaiSanId = l.loaiSanId
            LEFT JOIN DiaChi d ON s.diaChiId = d.diaChiId
            WHERE s.sanId = ?
        `;
        const [rows] = await db.execute(query, [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy sân" });
        res.json(rows[0]);
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
        const result = slots.map(slot => ({
            ...slot,
            status: slot.daDat > 0 ? 'Full' : (slot.lichChuSan === 'Mo' ? 'Available' : 'Closed'),
            finalPrice: slot.gia || 0
        }));

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

        const { sanId, ngayDat, khungGioId } = req.body;
        const nguoiDungId = req.user.id;
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

        // BƯỚC 6: Tạo bản ghi thanh toán chờ
        await connection.execute(
            `INSERT INTO ThanhToan (datSanId, nguoiDungId, soTien, trangThaiTT)
             VALUES (?, ?, ?, 'chua_thanh_toan')`,
            [datSanId, nguoiDungId, tongTien]
        );

        await connection.commit();
        shouldRollback = false;
         res.status(201).json({
            message: "Đặt sân thành công! Vui lòng chờ xác nhận.",
            datSanId,
            trangThai: "cho_xac_nhan"
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
                tt.trangThaiTT
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
                tt.trangThaiTT
            FROM DatSan ds
            JOIN NguoiDung nd ON ds.nguoiDungId = nd.nguoiDungId
            JOIN San s ON ds.sanId = s.sanId
            JOIN KhungGio kg ON ds.khungGioId = kg.khungGioId
            LEFT JOIN ThanhToan tt ON ds.datSanId = tt.datSanId
            WHERE s.chuSanId = ?
            ORDER BY ds.ngayDat DESC, kg.gioBatDau DESC
        `;
        const [rows] = await db.execute(query, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy danh sách đơn đặt sân" });
    }
};
//chủ sân xác nhận đơn
exports.updateStatus = async (req, res) => {
    const { id } = req.params; // ID của đơn đặt sân
    const { trangThai } = req.body; // 'da_xac_nhan' hoặc 'da_huy'

     if (!["da_xac_nhan", "da_huy"].includes(trangThai)) {
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
        if (check[0].trangThai !== "cho_xac_nhan") {
            return res.status(400).json({ message: "Chỉ cập nhật được đơn đang chờ xác nhận" });
        }
        await db.execute("UPDATE DatSan SET trangThai = ? WHERE datSanId = ?", [trangThai, id]);
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi cập nhật trạng thái" });
    }
};