-- Tạo database
CREATE DATABASE IF NOT EXISTS sport_booking;
USE sport_booking;

-- ========================
-- Bảng Người Dùng
-- ========================
CREATE TABLE IF NOT EXISTS NguoiDung (
    nguoiDungId INT AUTO_INCREMENT PRIMARY KEY,
    ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    matKhau VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('KhachHang', 'ChuSan', 'Admin') NOT NULL,
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- Bảng Sân
-- ========================
CREATE TABLE IF NOT EXISTS San (
    sanId INT AUTO_INCREMENT PRIMARY KEY,
    chuSanId INT NOT NULL,
    tenSan VARCHAR(100) NOT NULL,
    kieuSan VARCHAR(50),
    diaChi VARCHAR(255),
    giaThue DECIMAL(10,2),
    tinhTrang VARCHAR(20),
    ngayTaoSan DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chuSanId) REFERENCES NguoiDung(nguoiDungId)
        ON DELETE CASCADE
);

-- ========================
-- Bảng Đặt Sân
-- ========================
CREATE TABLE IF NOT EXISTS DatSan (
    datSanId INT AUTO_INCREMENT PRIMARY KEY,
    nguoiDungId INT NOT NULL,
    sanId INT NOT NULL,
    ngayDat DATE NOT NULL,
    gioBatDau TIME NOT NULL,
    gioKetThuc TIME NOT NULL,
    tongTien DECIMAL(10,2),
    trangThai ENUM('cho_xac_nhan', 'da_xac_nhan', 'hoan_thanh', 'da_huy') DEFAULT 'cho_xac_nhan',
    FOREIGN KEY (nguoiDungId) REFERENCES NguoiDung(nguoiDungId)
        ON DELETE CASCADE,
    FOREIGN KEY (sanId) REFERENCES San(sanId)
        ON DELETE CASCADE
);

-- ========================
-- Bảng Đánh Giá
-- ========================
CREATE TABLE IF NOT EXISTS DanhGia (
    danhGiaId INT AUTO_INCREMENT PRIMARY KEY,
    nguoiDungId INT NOT NULL,
    sanId INT NOT NULL,
    soSao INT CHECK (soSao BETWEEN 1 AND 5),
    noiDung TEXT,
    ngayDG DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoiDungId) REFERENCES NguoiDung(nguoiDungId)
        ON DELETE CASCADE,
    FOREIGN KEY (sanId) REFERENCES San(sanId)
        ON DELETE CASCADE
);

-- ========================
-- Bảng Thanh Toán
-- ========================
CREATE TABLE IF NOT EXISTS ThanhToan (
    thanhToanId INT AUTO_INCREMENT PRIMARY KEY,
    datSanId INT NOT NULL,
    soTien DECIMAL(10,2),
    phuongThuc VARCHAR(50),
    trangThaiTT VARCHAR(20),
    ngayTT DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (datSanId) REFERENCES DatSan(datSanId)
        ON DELETE CASCADE
);

-- ========================
-- Dữ liệu mẫu (test)
-- ========================

-- Admin
INSERT INTO NguoiDung (ten, email, matKhau, role)
VALUES ('Admin', 'admin@gmail.com', '123456', 'Admin');

-- Chủ sân
INSERT INTO NguoiDung (ten, email, matKhau, role)
VALUES ('Chu San A', 'chusan@gmail.com', '123456', 'ChuSan');

-- Khách hàng
INSERT INTO NguoiDung (ten, email, matKhau, role)
VALUES ('Nguyen Van A', 'user@gmail.com', '123456', 'KhachHang');

-- Sân mẫu
INSERT INTO San (chuSanId, tenSan, kieuSan, diaChi, giaThue, tinhTrang)
VALUES (2, 'Sân bóng đá A', 'Bóng đá', 'Hà Nội', 200000, 'Hoạt động');

-- Đặt sân mẫu
INSERT INTO DatSan (nguoiDungId, sanId, ngayDat, gioBatDau, gioKetThuc, tongTien)
VALUES (3, 1, '2026-06-20', '17:00:00', '18:00:00', 200000);