-- =========================
-- TẠO DATABASE
-- =========================
DROP DATABASE IF EXISTS sport_booking;
CREATE DATABASE sport_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sport_booking;

-- =========================
-- BẢNG NGƯỜI DÙNG
-- =========================
CREATE TABLE NguoiDung (
    nguoiDungId INT AUTO_INCREMENT PRIMARY KEY,
    ten VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    matKhau VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('KhachHang', 'ChuSan', 'Admin') NOT NULL,
    ngayTao DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- BẢNG LOẠI SÂN
-- =========================
CREATE TABLE LoaiSan (
    loaiSanId INT AUTO_INCREMENT PRIMARY KEY,
    tenLoai VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO LoaiSan (tenLoai) VALUES
('Bóng đá'),
('Cầu lông'),
('Pickleball');

-- =========================
-- BẢNG ĐỊA CHỈ
-- =========================
CREATE TABLE DiaChi (
    diaChiId INT AUTO_INCREMENT PRIMARY KEY,
    tinhThanh VARCHAR(100),
    quanHuyen VARCHAR(100),
    phuongXa VARCHAR(100),
    diaChiChiTiet VARCHAR(255),
    viDo DECIMAL(10, 8) NULL,
    kinhDo DECIMAL(11, 8) NULL
);

-- =========================
-- BẢNG SÂN
-- =========================
CREATE TABLE San (
    sanId INT AUTO_INCREMENT PRIMARY KEY,

    chuSanId INT NOT NULL,
    loaiSanId INT NOT NULL,
    diaChiId INT NOT NULL,

    tenSan VARCHAR(100) NOT NULL,
    moTa TEXT,
    hinhANH VARCHAR(100),
    tinhTrang VARCHAR(50) DEFAULT 'HoatDong',
    ngayTaoSan DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (chuSanId, tenSan, diaChiId),

    FOREIGN KEY (chuSanId) REFERENCES NguoiDung(nguoiDungId) ON DELETE CASCADE,
    FOREIGN KEY (loaiSanId) REFERENCES LoaiSan(loaiSanId),
    FOREIGN KEY (diaChiId) REFERENCES DiaChi(diaChiId)
);

-- =========================
-- BẢNG KHUNG GIỜ
-- =========================
CREATE TABLE KhungGio (
    khungGioId INT AUTO_INCREMENT PRIMARY KEY,
    gioBatDau TIME NOT NULL,
    gioKetThuc TIME NOT NULL,

    UNIQUE (gioBatDau, gioKetThuc)
);

-- dữ liệu mẫu khung giờ
INSERT INTO KhungGio (gioBatDau, gioKetThuc) VALUES
('06:00', '07:00'),
('07:00', '08:00'),
('08:00', '09:00'),
('09:00', '10:00'),
('17:00', '18:00'),
('18:00', '19:00'),
('19:00', '20:00');

-- =========================
-- BẢNG GIÁ SÂN (LINH HOẠT)
-- =========================
CREATE TABLE GiaSan (
    giaSanId INT AUTO_INCREMENT PRIMARY KEY,

    sanId INT NOT NULL,
    khungGioId INT NOT NULL,
    thuTrongTuan INT NOT NULL, -- 2-8 (Thứ 2 - CN)

    gia DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (sanId) REFERENCES San(sanId) ON DELETE CASCADE,
    FOREIGN KEY (khungGioId) REFERENCES KhungGio(khungGioId),

    UNIQUE (sanId, khungGioId, thuTrongTuan)
);

-- =========================
-- BẢNG LỊCH SÂN
-- =========================
CREATE TABLE LichSan (
    lichSanId INT AUTO_INCREMENT PRIMARY KEY,

    sanId INT NOT NULL,
    khungGioId INT NOT NULL,
    ngay DATE NOT NULL,

    trangThai ENUM('Mo', 'Dong', 'BaoTri') DEFAULT 'Mo',

    FOREIGN KEY (sanId) REFERENCES San(sanId) ON DELETE CASCADE,
    FOREIGN KEY (khungGioId) REFERENCES KhungGio(khungGioId),

    UNIQUE (sanId, ngay, khungGioId)
);

-- =========================
-- BẢNG ĐẶT SÂN
-- =========================
CREATE TABLE DatSan (
    datSanId INT AUTO_INCREMENT PRIMARY KEY,

    nguoiDungId INT NOT NULL,
    sanId INT NOT NULL,
    khungGioId INT NOT NULL,

    ngayDat DATE NOT NULL,
    tongTien DECIMAL(10,2),

    trangThai ENUM(
        'cho_xac_nhan',
        'da_xac_nhan',
        'hoan_thanh',
        'da_huy'
    ) DEFAULT 'cho_xac_nhan',

    UNIQUE (sanId, ngayDat, khungGioId),

    FOREIGN KEY (nguoiDungId) REFERENCES NguoiDung(nguoiDungId) ON DELETE CASCADE,
    FOREIGN KEY (sanId) REFERENCES San(sanId) ON DELETE CASCADE,
    FOREIGN KEY (khungGioId) REFERENCES KhungGio(khungGioId)
);

-- =========================
-- BẢNG ĐÁNH GIÁ
-- =========================
CREATE TABLE DanhGia (
    danhGiaId INT AUTO_INCREMENT PRIMARY KEY,

    nguoiDungId INT NOT NULL,
    sanId INT NOT NULL,

    soSao INT CHECK (soSao BETWEEN 1 AND 5),
    noiDung TEXT,
    ngayDG DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (nguoiDungId) REFERENCES NguoiDung(nguoiDungId) ON DELETE CASCADE,
    FOREIGN KEY (sanId) REFERENCES San(sanId) ON DELETE CASCADE
);

-- =========================
-- BẢNG THANH TOÁN (ĐÃ FIX)
-- =========================
CREATE TABLE ThanhToan (
    thanhToanId INT AUTO_INCREMENT PRIMARY KEY,

    datSanId INT NOT NULL,
    nguoiDungId INT NOT NULL,

    soTien DECIMAL(10,2),
    phuongThuc VARCHAR(50),

    trangThaiTT ENUM('chua_thanh_toan', 'da_thanh_toan') DEFAULT 'chua_thanh_toan',
    ngayTT DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (datSanId) REFERENCES DatSan(datSanId) ON DELETE CASCADE,
    FOREIGN KEY (nguoiDungId) REFERENCES NguoiDung(nguoiDungId) ON DELETE CASCADE
);