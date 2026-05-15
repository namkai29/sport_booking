const db = require("../config/db");
const SanModel = require("../models/san.model");
const { publicCourtUploadPrefix, removeCourtImage } = require("../middleware/upload.middleware");

const getUploadedImagePath = (file) => file ? `${publicCourtUploadPrefix}${file.filename}` : "";

const cleanupUploadedImage = async (file) => {
    if (file) {
        await removeCourtImage(getUploadedImagePath(file));
    }
};

// =====================
// CREATE
// =====================
exports.createSan = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;

    try {
        await connection.beginTransaction();
        req.body.hinhAnh = getUploadedImagePath(req.file);

        const isLoaiSanValid = await SanModel.checkLoaiSan(connection, req.body.loaiSanId);
        if (!isLoaiSanValid) {
            await connection.rollback();
            shouldRollback = false;
            await cleanupUploadedImage(req.file);
            return res.status(400).json({ message: "Loại sân không hợp lệ" });
        }

        const isTrung = await SanModel.checkTrungSan(connection, req.body, req.user.id);
        if (isTrung) {
            await connection.rollback();
            shouldRollback = false;
            await cleanupUploadedImage(req.file);
            return res.status(400).json({ message: "Sân đã tồn tại" });
        }

        const diaChiId = await SanModel.createDiaChi(connection, req.body);
        const sanId = await SanModel.createSan(connection, req.body, diaChiId, req.user.id);

        await connection.commit();
        shouldRollback = false;

        res.json({ message: "Tạo sân thành công", sanId });

    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        await cleanupUploadedImage(req.file);
        res.status(500).json(err);
    } finally {
        connection.release();
    }
};

// =====================
// GET ALL
// =====================
exports.getMySan = async (req, res) => {
    const data = await SanModel.getAllByOwner(req.user.id);
    res.json(data);
};

// =====================
// GET ONE
// =====================
exports.getSanDetail = async (req, res) => {
    const san = await SanModel.getById(req.params.id);

    if (!san) {
        return res.status(404).json({ message: "Không tìm thấy sân" });
    }

    res.json(san);
};

// =====================
// UPDATE
// =====================
exports.updateSan = async (req, res) => {
    const connection = await db.getConnection();
    let shouldRollback = true;

    try {
        await connection.beginTransaction();

        const san = await SanModel.getById(req.params.id);

        if (!san) {
            await connection.rollback();
            shouldRollback = false;
            await cleanupUploadedImage(req.file);
            return res.status(404).json({ message: "Không tồn tại" });
        }

        // 🔥 CHẶN SỬA NGƯỜI KHÁC
        if (san.chuSanId !== req.user.id) {
            await connection.rollback();
            shouldRollback = false;
            await cleanupUploadedImage(req.file);
            return res.status(403).json({ message: "Không có quyền" });
        }

        req.body.hinhAnh = req.file ? getUploadedImagePath(req.file) : (san.hinhAnh || "");

        await SanModel.updateSan(connection, req.params.id, req.body);
        await SanModel.updateDiaChi(connection, san.diaChiId, req.body);

        await connection.commit();
        shouldRollback = false;

        if (req.file && san.hinhAnh !== req.body.hinhAnh) {
            await removeCourtImage(san.hinhAnh);
        }

        res.json({ message: "Cập nhật thành công" });

    } catch (err) {
        if (shouldRollback) {
            await connection.rollback();
        }
        await cleanupUploadedImage(req.file);
        res.status(500).json(err);
    } finally {
        connection.release();
    }
};

// =====================
// DELETE
// =====================
exports.deleteSan = async (req, res) => {
    const san = await SanModel.getById(req.params.id);

    if (!san) {
        return res.status(404).json({ message: "Không tồn tại" });
    }

    // 🔥 CHẶN XÓA NGƯỜI KHÁC
    if (san.chuSanId !== req.user.id) {
        return res.status(403).json({ message: "Không có quyền" });
    }

    await SanModel.deleteSan(req.params.id);
    await removeCourtImage(san.hinhAnh);

    res.json({ message: "Xóa thành công" });
};