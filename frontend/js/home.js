const API_BASE_URL = '/api/bookings';

document.addEventListener('DOMContentLoaded', () => {
    // Lấy tất cả sân ngay khi load trang
    fetchCourts();

    // Lắng nghe sự kiện Enter trên ô search
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchAction();
    });
});

async function fetchCourts(queryString = '') {
    const courtGrid = document.getElementById('courtGrid');
    courtGrid.innerHTML = '<div class="status">Đang tải dữ liệu...</div>';

    try {
        // Kết nối đúng Route GET /search của bạn
        const response = await fetch(`${API_BASE_URL}/search${queryString}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Lỗi server');

        renderCourts(data);
    } catch (error) {
        console.error('Lỗi:', error);
        courtGrid.innerHTML = `<div class="error">Lỗi: ${escapeHtml(error.message)}</div>`;
    }
}

function renderCourts(courts) {
    const courtGrid = document.getElementById('courtGrid');
    
    if (courts.length === 0) {
        courtGrid.innerHTML = '<div class="status">Không tìm thấy sân nào.</div>';
        return;
    }

    courtGrid.innerHTML = courts.map(court => {
        const imageSrc = escapeHtml(court.hinhAnh || 'https://via.placeholder.com/300x180?text=No+Image');
        const tenLoai = escapeHtml(court.tenLoai);
        const tenSan = escapeHtml(court.tenSan);
        const diaChi = escapeHtml(`${court.diaChiChiTiet || ''}, ${court.quanHuyen || ''}, ${court.tinhThanh || ''}`);
        const tinhTrang = court.tinhTrang === 'HoatDong' ? 'Đang mở' : 'Đóng cửa';
        return `
            <div class="court-card">
                <div class="court-badge">${court.tenLoai}</div>
                <div class="court-badge">${tenLoai}</div>
                <img src="${imageSrc}"
                     alt="${tenSan}"
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x180?text=Loi+Anh';">
                <div class="court-info">
                    <h3>${tenSan}</h3>
                    <p><i class="fa-solid fa-location-dot"></i> ${diaChi}</p>
                    <div class="court-footer">
                        <span class="status-tag">${tinhTrang}</span>
                        <button class="btn-book" onclick="goToDetail(${court.sanId})">Chi tiết</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function searchAction() {
    const tenSan = document.getElementById('searchInput').value;
    const loaiSanText = document.getElementById('typeFilter').value; 
    
    // Ánh xạ value của select sang loaiSanId trong DB của bạn
    let loaiSanId = "";
    if(loaiSanText === "football") loaiSanId = "1";
    if(loaiSanText === "badminton") loaiSanId = "2";

    // Tạo Query String chuẩn cho backend/controllers/datSan.controller.js
    let params = new URLSearchParams();
    if (tenSan) params.append('tenSan', tenSan);
    if (loaiSanId) params.append('loaiSanId', loaiSanId);

    fetchCourts(`?${params.toString()}`);
}

function goToDetail(id) {
    // Chuyển hướng sang trang chi tiết để dùng hàm checkAvailableSlots
    window.location.href = `/frontend/detail.html?sanId=${id}`;
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}