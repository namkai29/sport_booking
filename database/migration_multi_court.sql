-- Migration: đa sân + khung giờ theo chủ sân
-- Chạy trên DB sport_booking đã tồn tại

USE sport_booking;

ALTER TABLE San ADD COLUMN IF NOT EXISTS soLuongSan INT NOT NULL DEFAULT 1 AFTER hinhAnh;
ALTER TABLE DatSan ADD COLUMN IF NOT EXISTS soLuong INT NOT NULL DEFAULT 1 AFTER ngayDat;

-- Thêm sanId vào KhungGio (bỏ unique cũ nếu có)
ALTER TABLE KhungGio ADD COLUMN IF NOT EXISTS sanId INT NULL AFTER khungGioId;

-- MySQL 8: bỏ unique cũ và thêm unique mới (chạy thủ công nếu lỗi)
-- ALTER TABLE KhungGio DROP INDEX gioBatDau;
-- ALTER TABLE KhungGio ADD UNIQUE KEY uk_san_gio (sanId, gioBatDau, gioKetThuc);
-- ALTER TABLE KhungGio ADD CONSTRAINT fk_khunggio_san FOREIGN KEY (sanId) REFERENCES San(sanId) ON DELETE CASCADE;
