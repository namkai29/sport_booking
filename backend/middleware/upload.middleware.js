const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "courts");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(new Error("Chỉ cho phép upload ảnh JPG, PNG, WebP hoặc GIF"));
        return;
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = {
    courtImage: (req, res, next) => {
        upload.single("hinhAnhFile")(req, res, (err) => {
            if (!err) {
                next();
                return;
            }

            const message = err.code === "LIMIT_FILE_SIZE"
                ? "Ảnh sân không được vượt quá 5MB"
                : err.message;
            res.status(400).json({ message });
        });
    }
};
