const API_BASE_URL = '/api/bookings';

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.ten) {
        document.getElementById('homeUserName').innerText = `Chào, ${user.ten}`;
    }

    // Lấy tất cả sân ngay khi load trang
    fetchCourts();

    // Lắng nghe sự kiện Enter trên ô search
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchAction();
    });

    document.getElementById('typeFilter').addEventListener('change', () => {
        document.getElementById('heroTypeFilter').value = document.getElementById('typeFilter').value;
        searchAction();
    });

    document.getElementById('heroTypeFilter').addEventListener('change', () => {
        document.getElementById('typeFilter').value = document.getElementById('heroTypeFilter').value;
        searchAction();
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
        document.getElementById('courtSummary').innerText = 'Không thể tải danh sách sân.';
    }
}

function renderCourts(courts) {
    const courtGrid = document.getElementById('courtGrid');
    
    if (courts.length === 0) {
        courtGrid.innerHTML = '<div class="status">Không tìm thấy sân nào.</div>';
        document.getElementById('courtSummary').innerText = 'Không có sân phù hợp với bộ lọc hiện tại.';
        return;
    }

    document.getElementById('courtSummary').innerText = `Tìm thấy ${courts.length} sân phù hợp.`;

    courtGrid.innerHTML = courts.map(court => {
        const imageSrc = escapeHtml(getImageUrl(court.hinhAnh));
        const tenLoai = escapeHtml(court.tenLoai);
        const tenSan = escapeHtml(court.tenSan);
        const addressParts = [court.diaChiChiTiet, court.quanHuyen, court.tinhThanh].filter(Boolean);
        const diaChi = escapeHtml(addressParts.join(', ') || 'Chưa cập nhật địa chỉ');
        const tinhTrang = court.tinhTrang === 'HoatDong' ? 'Đang mở' : 'Đóng cửa';
        const imageHtml = imageSrc
            ? `<img src="${imageSrc}" alt="${tenSan}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="court-image-fallback" style="display:none;">SportHub</div>`
            : '<div class="court-image-fallback">SportHub</div>';

        return `
            <div class="court-card">
                <div class="court-media">
                    ${imageHtml}
                    <div class="court-badge">${tenLoai}</div>
                </div>
                <div class="court-info">
                    <h3>${tenSan}</h3>
                    <p><i class="fa-solid fa-location-dot"></i> ${diaChi}</p>
                    <div class="court-meta">
                        <span class="meta-chip"><i class="fa-solid fa-star"></i> 4.8</span>
                        <span class="meta-chip"><i class="fa-regular fa-clock"></i> Có lịch trống</span>
                    </div>
                    <div class="court-footer">
                        <span class="status-tag">${tinhTrang}</span>
                        <button class="btn-book" onclick="goToDetail(${court.sanId})">
                            Đặt ngay <i class="fa-solid fa-arrow-right"></i>
                        </button>
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
    if(loaiSanText === "tennis") loaiSanId = "3";

    // Tạo Query String chuẩn cho backend/controllers/datSan.controller.js
    let params = new URLSearchParams();
    if (tenSan) params.append('tenSan', tenSan);
    if (loaiSanId) params.append('loaiSanId', loaiSanId);

    fetchCourts(`?${params.toString()}`);
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('heroTypeFilter').value = 'all';
    fetchCourts();
}

function goToDetail(id) {
    // Chuyển hướng sang trang chi tiết để dùng hàm checkAvailableSlots
    window.location.href = `/frontend/detail.html?sanId=${id}`;
}

function getImageUrl(value) {
    if (!value) return "";
    if (/^(https?:\/\/|blob:|data:image\/)/i.test(value)) return value;
    return value.startsWith("/") ? value : `/${value}`;
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