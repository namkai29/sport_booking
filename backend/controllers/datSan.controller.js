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

// hiện ma traanj khung giờ
exports.checkAvailableSlots = async (req, res) => {
    const { sanId, ngay } = req.query;
    const thuInSql = new Date(ngay).getDay() === 0 ? 8 : new Date(ngay).getDay() + 1;

    try {
        const query = `
            SELECT 
                kg.khungGioId, kg.gioBatDau, kg.gioKetThuc,
                gs.gia,
                ls.trangThai AS lichChuSan,
                (SELECT COUNT(*) FROM DatSan ds 
                 WHERE ds.sanId = ? AND ds.ngayDat = ? AND ds.khungGioId = kg.khungGioId 
                 AND ds.trangThai IN ('cho_xac_nhan', 'da_xac_nhan')) AS daDat
            FROM KhungGio kg
            LEFT JOIN GiaSan gs ON kg.khungGioId = gs.khungGioId AND gs.sanId = ? AND gs.thuTrongTuan = ?
            LEFT JOIN LichSan ls ON kg.khungGioId = ls.khungGioId AND ls.sanId = ? AND ls.ngay = ?
            ORDER BY kg.gioBatDau ASC
        `;

        const [slots] = await db.execute(query, [sanId, ngay, sanId, thuInSql, sanId, ngay]);
        
        // Map lại dữ liệu để Frontend dễ hiển thị màu sắc (Xanh: Trống, Đỏ: Hết, Xám: Đóng)
        const result = slots.map(slot => ({
            ...slot,
            status: slot.daDat > 0 ? 'Full' : (slot.lichChuSan === 'Dong' ? 'Closed' : 'Available'),
            finalPrice: slot.gia || 0
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Lỗi tải lịch sân" });
    }
};

exports.createBooking = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { sanId, ngayDat, khungGioId } = req.body;
        const nguoiDungId = req.user.id;

        // BƯỚC 1: Validate ngày (Không đặt ngày quá khứ)
        const ngayDatDate = new Date(ngayDat);
        if (ngayDatDate < new Date().setHours(0,0,0,0)) {
            return res.status(400).json({ message: "Không thể đặt sân cho ngày đã qua" });
        }

        // BƯỚC 2: Check trạng thái mở cửa (LichSan)
        const isMo = await Model.checkSanSang(sanId, ngayDat, khungGioId);
        if (!isMo) {
            return res.status(400).json({ message: "Sân hiện không mở cửa vào khung giờ này" });
        }

        // BƯỚC 3: Check trùng lịch (Tránh Race Condition sơ cấp)
        const isTrung = await Model.checkTrungLich(sanId, ngayDat, khungGioId);
        if (isTrung) {
            return res.status(400).json({ message: "Rất tiếc, khung giờ này vừa có người đặt" });
        }

        // BƯỚC 4: Tính toán giá tiền
        // Chuyển đổi JS Day (0-6) sang định dạng của bạn (2-8)
        const jsDay = ngayDatDate.getDay(); // 0: CN, 1: T2...
        const thuTrongTuan = jsDay === 0 ? 8 : jsDay + 1;

        const tongTien = await Model.getGiaTien(sanId, khungGioId, thuTrongTuan);
        if (!tongTien) {
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
        res.json({ message: "Đặt sân thành công! Vui lòng chờ xác nhận.", datSanId });

    } catch (err) {
        await connection.rollback();
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
            SELECT ds.*, s.tenSan, kg.gioBatDau, kg.gioKetThuc, tt.trangThaiTT
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
//chủ sân xác nhận đơn
exports.updateStatus = async (req, res) => {
    const { id } = req.params; // ID của đơn đặt sân
    const { trangThai } = req.body; // 'da_xac_nhan' hoặc 'da_huy'

    try {
        // Kiểm tra xem đơn này có thuộc sân của chủ sân này không
        const [check] = await db.execute(
            `SELECT ds.* FROM DatSan ds 
             JOIN San s ON ds.sanId = s.sanId 
             WHERE ds.datSanId = ? AND s.chuSanId = ?`,
            [id, req.user.id]
        );

        if (check.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền quản lý đơn này" });
        }

        await db.execute("UPDATE DatSan SET trangThai = ? WHERE datSanId = ?", [trangThai, id]);
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi cập nhật trạng thái" });
    }
};