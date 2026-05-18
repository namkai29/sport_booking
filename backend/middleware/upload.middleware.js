const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "courts");
const publicCourtUploadPrefix = "/uploads/courts/";
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const extensionByMimeType = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
};

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalExt = path.extname(file.originalname).toLowerCase();
        const ext = extensionByMimeType[file.mimetype] || originalExt;
        const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
        cb(null, safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
        cb(new Error("Chỉ cho phép upload ảnh JPG, PNG, WebP hoặc GIF"));
        return;
    }

    cb(null, true);
};

const getCourtImagePath = (imagePath) => {
    if (!imagePath || !imagePath.startsWith(publicCourtUploadPrefix)) {
        return null;
    }

    const filename = path.basename(imagePath);
    const fullPath = path.join(uploadDir, filename);
    const relativePath = path.relative(uploadDir, fullPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        return null;
    }

    return fullPath;
};

const removeCourtImage = async (imagePath) => {
    const filePath = getCourtImagePath(imagePath);
    if (!filePath) {
        return;
    }

    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Không thể xóa ảnh sân:", error.message);
        }
    }
};

const isImageSignatureValid = async (filePath, mimetype) => {
    const handle = await fs.promises.open(filePath, "r");
    try {
        const buffer = Buffer.alloc(12);
        const { bytesRead } = await handle.read(buffer, 0, 12, 0);
        if (bytesRead < 4) {
            return false;
        }

        if (mimetype === "image/jpeg") {
            return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        }

        if (mimetype === "image/png") {
            return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        }

        if (mimetype === "image/webp") {
            return buffer.subarray(0, 4).toString("ascii") === "RIFF"
                && buffer.subarray(8, 12).toString("ascii") === "WEBP";
        }

        if (mimetype === "image/gif") {
            const signature = buffer.subarray(0, 6).toString("ascii");
            return signature === "GIF87a" || signature === "GIF89a";
        }

        return false;
    } finally {
        await handle.close();
    }
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
        upload.single("hinhAnhFile")(req, res, async (err) => {
            if (err) {
                const message = err.code === "LIMIT_FILE_SIZE"
                    ? "Ảnh sân không được vượt quá 5MB"
                    : err.message;
                res.status(400).json({ message });
                return;
            }

            if (!req.file) {
                next();
                return;
            }

            try {
                const isValid = await isImageSignatureValid(req.file.path, req.file.mimetype);
                if (!isValid) {
                    await removeCourtImage(`${publicCourtUploadPrefix}${req.file.filename}`);
                    res.status(400).json({ message: "File tải lên không phải ảnh hợp lệ" });
                    return;
                }
                next();
            } catch (error) {
                await removeCourtImage(`${publicCourtUploadPrefix}${req.file.filename}`);
                res.status(400).json({ message: "Không thể kiểm tra file ảnh tải lên" });
            }
        });
    },
    removeCourtImage,
    publicCourtUploadPrefix
};
