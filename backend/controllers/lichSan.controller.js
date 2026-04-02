const db = require("../config/db");
const Model = require("../models/lichSan.model");

// ======================
// BULK CREATE
// ======================
exports.createBulk = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { sanId, ngay, list } = req.body;

        if (!sanId || !ngay || !Array.isArray(list)) {
            return res.status(400).json({ message: "Thiếu dữ liệu" });
        }

        // check quyền
        const san = await Model.checkOwnerSan(sanId, req.user.id);
        if (!san) {
            return res.status(403).json({ message: "Không có quyền" });
        }

        let success = [];
        let failed = [];

        for (const item of list) {
            const { khungGioId, trangThai } = item;

            try {
                if (!khungGioId || !trangThai) {
                    throw new Error("Dữ liệu sai");
                }

                if (!["Mo", "Dong", "BaoTri"].includes(trangThai)) {
                    throw new Error("Trạng thái không hợp lệ");
                }

                const isValidKhung = await Model.checkKhungGio(khungGioId);
                if (!isValidKhung) {
                    throw new Error("Khung giờ không tồn tại");
                }

                const isTrung = await Model.checkTrung(
                    sanId,
                    ngay,
                    khungGioId
                );

                if (isTrung) {
                    failed.push({ ...item, reason: "Đã tồn tại" });
                    continue;
                }

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

        res.json({
            message: "Tạo lịch thành công",
            successCount: success.length,
            failCount: failed.length,
            success,
            failed
        });

    } catch (err) {
        await connection.rollback();
        res.status(500).json(err);
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

    await Model.updateTrangThai(req.params.id, trangThai);

    res.json({ message: "Cập nhật thành công" });
};

// ======================
// DELETE
// ======================
exports.deleteLich = async (req, res) => {
    await Model.deleteLich(req.params.id);
    res.json({ message: "Xóa thành công" });
};