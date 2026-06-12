const db = require("../config/db");
const Model = require("../models/lichSan.model");

// ======================
// BULK CREATE
// ======================
exports.createBulk = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;

    try {
        await connection.beginTransaction();

        const { sanId, ngay, list } = req.body;

        if (!sanId || !ngay || !Array.isArray(list)) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(400).json({ message: "Thiếu dữ liệu" });
        }

        // 1. Kiểm tra quyền sở hữu sân
        const san = await Model.checkOwnerSan(sanId, req.user.id);
        if (!san) {
            await connection.rollback();
            shouldRollback = false;
            return res.status(403).json({ message: "Không có quyền" });
        }

        // 2. [BƯỚC QUAN TRỌNG] Xóa hết lịch cũ của ngày hôm đó để ghi đè dữ liệu mới
        // Điều này giúp giải quyết việc bạn chuyển từ Đóng/Mở về lại "Chưa thiết lập"
        await connection.execute(
            `DELETE FROM LichSan WHERE sanId = ? AND ngay = ?`,
            [sanId, ngay]
        );

        let success = [];
        let failed = [];

        // 3. Tiến hành Insert các khung giờ được gửi lên
        for (const item of list) {
            const { khungGioId, trangThai } = item;

            try {
                if (!khungGioId || !trangThai) {
                    throw new Error("Dữ liệu sai");
                }

                if (!["Mo", "Dong", "BaoTri"].includes(trangThai)) {
                    throw new Error("Trạng thái không hợp lệ");
                }

                const isValidKhung = await Model.checkKhungGio(khungGioId, sanId);
                if (!isValidKhung) {
                    throw new Error("Khung giờ không tồn tại");
                }

                // Không cần check trùng nữa vì bước 2 đã xóa sạch sẽ dữ liệu cũ của ngày này rồi
                await connection.execute(
                    `INSERT INTO LichSan (sanId, khungGioId, ngay, trangThai)
                     VALUES (?, ?, ?, ?)`,
                    [sanId, khungGioId, ngay, trangThai]
                );

                success.push(item);

            } catch (err) {
                failed.push({ ...item, reason: err.message });
            }
        }

        await connection.commit();
        shouldRollback = false;

        res.json({
            message: "Cập nhật thời gian biểu thành công",
            successCount: success.length,
            failCount: failed.length,
            success,
            failed
        });

    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        console.error("Lỗi bulk lịch:", err);
        res.status(500).json({ message: "Lỗi hệ thống khi lưu lịch" });
    } finally {
        connection.release();
    }
};

// ======================
// GET LỊCH
// ======================
exports.getBySan = async (req, res) => {
    const data = await Model.getBySan(req.params.sanId);
    res.json(data);
};

// ======================
// UPDATE
// ======================
exports.updateTrangThai = async (req, res) => {
    const { trangThai } = req.body;

    if (!["Mo", "Dong", "BaoTri"].includes(trangThai)) {
        return res.status(400).json({ message: "Sai trạng thái" });
    }

    const lich = await Model.getLichOwner(req.params.id, req.user.id);
    if (!lich) {
        return res.status(403).json({ message: "Không có quyền cập nhật lịch này" });
    }
 

    await Model.updateTrangThai(req.params.id, trangThai);

    res.json({ message: "Cập nhật thành công" });
};

// ======================
// DELETE
// ======================
exports.deleteLich = async (req, res) => {
    const lich = await Model.getLichOwner(req.params.id, req.user.id);
    if (!lich) {
        return res.status(403).json({ message: "Không có quyền xóa lịch này" });
    }
    await Model.deleteLich(req.params.id);
    res.json({ message: "Xóa thành công" });
};

// ======================
// KHUNG GIỜ THEO SÂN
// ======================
exports.getKhungGioBySan = async (req, res) => {
    try {
        const { sanId } = req.params;
        const slots = await Model.getKhungGioBySan(sanId);
        res.json(slots);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy khung giờ" });
    }
};

exports.addKhungGioSan = async (req, res) => {
    try {
        const { sanId } = req.params;
        const { gioBatDau, gioKetThuc } = req.body;

        if (!gioBatDau || !gioKetThuc) {
            return res.status(400).json({ message: "Vui lòng nhập giờ bắt đầu và kết thúc" });
        }
        if (gioBatDau >= gioKetThuc) {
            return res.status(400).json({ message: "Giờ kết thúc phải sau giờ bắt đầu" });
        }

        const san = await Model.checkOwnerSan(sanId, req.user.id);
        if (!san) {
            return res.status(403).json({ message: "Không có quyền" });
        }

        const khungGioId = await Model.createKhungGioSan(sanId, gioBatDau, gioKetThuc);
        res.status(201).json({ message: "Thêm khung giờ thành công", khungGioId });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Khung giờ này đã tồn tại" });
        }
        res.status(500).json({ message: "Lỗi thêm khung giờ" });
    }
};

exports.deleteKhungGioSan = async (req, res) => {
    try {
        const { sanId, khungGioId } = req.params;
        const slot = await Model.getKhungGioOwner(khungGioId, sanId, req.user.id);
        if (!slot) {
            return res.status(403).json({ message: "Không có quyền hoặc khung giờ không tồn tại" });
        }
        await Model.deleteKhungGioSan(khungGioId, sanId);
        res.json({ message: "Xóa khung giờ thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi xóa khung giờ" });
    }
};

exports.copyDefaultKhungGio = async (req, res) => {
    try {
        const { sanId } = req.params;
        const san = await Model.checkOwnerSan(sanId, req.user.id);
        if (!san) {
            return res.status(403).json({ message: "Không có quyền" });
        }
        const count = await Model.copyDefaultKhungGio(sanId);
        res.json({ message: count > 0 ? `Đã sao chép ${count} khung giờ mẫu` : "Sân đã có khung giờ riêng", count });
    } catch (err) {
        res.status(500).json({ message: "Lỗi sao chép khung giờ" });
    }
};