const API_BASE_URL = '/api/bookings';
const COURTS_PER_PAGE = 9;

let currentPage = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initCustomerLayout === 'function') {
        initCustomerLayout({ activePage: 'home' });
    }
    fetchCourts();

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

function buildSearchParams(page = 1) {
    const params = new URLSearchParams();
    const tenSan = document.getElementById('searchInput').value.trim();
    const loaiSanText = document.getElementById('typeFilter').value;

    let loaiSanId = '';
    if (loaiSanText === 'football') loaiSanId = '1';
    if (loaiSanText === 'badminton') loaiSanId = '2';
    if (loaiSanText === 'tennis') loaiSanId = '3';

    if (tenSan) params.append('tenSan', tenSan);
    if (loaiSanId) params.append('loaiSanId', loaiSanId);
    params.append('page', String(page));
    params.append('limit', String(COURTS_PER_PAGE));

    return params;
}

async function fetchCourts(page = 1) {
    const courtGrid = document.getElementById('courtGrid');
    const paginationEl = document.getElementById('courtPagination');
    currentPage = page;

    courtGrid.innerHTML = `
        <div class="court-skeleton-grid">
            ${Array.from({ length: 6 }, () => '<div class="court-skeleton"></div>').join('')}
        </div>
    `;
    if (paginationEl) paginationEl.innerHTML = '';

    try {
        const params = buildSearchParams(page);
        const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Lỗi server');

        const courts = Array.isArray(data) ? data : (data.courts || []);
        const pagination = data.pagination || {
            page: 1,
            limit: courts.length,
            total: courts.length,
            totalPages: 1,
        };

        renderCourts(courts, pagination);
        renderPagination(pagination);
    } catch (error) {
        console.error('Lỗi:', error);
        courtGrid.innerHTML = `<div class="error"><i class="fa-solid fa-circle-exclamation"></i> Lỗi: ${escapeHtml(error.message)}</div>`;
        document.getElementById('courtSummary').innerText = 'Không thể tải danh sách sân.';
    }
}

function formatPrice(value) {
    const amount = Number(value || 0);
    if (!amount) return null;
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function renderCourts(courts, pagination) {
    const courtGrid = document.getElementById('courtGrid');
    const { page, limit, total } = pagination;

    if (courts.length === 0) {
        courtGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-magnifying-glass"></i>
                <h3>Không tìm thấy sân nào</h3>
                <p>Thử đổi từ khóa hoặc bộ lọc loại sân.</p>
                <button class="btn-outline" onclick="resetFilters()">Xóa bộ lọc</button>
            </div>
        `;
        document.getElementById('courtSummary').innerText = 'Không có sân phù hợp với bộ lọc hiện tại.';
        return;
    }

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    document.getElementById('courtSummary').innerText =
        `Hiển thị ${start}–${end} trong tổng số ${total} sân phù hợp.`;

    courtGrid.innerHTML = courts.map(court => {
        const imageSrc = escapeHtml(getImageUrl(court.hinhAnh));
        const tenLoai = escapeHtml(court.tenLoai);
        const tenSan = escapeHtml(court.tenSan);
        const addressParts = [court.diaChiChiTiet, court.quanHuyen, court.tinhThanh].filter(Boolean);
        const diaChi = escapeHtml(addressParts.join(', ') || 'Chưa cập nhật địa chỉ');
        const tinhTrang = court.tinhTrang === 'HoatDong' ? 'Đang mở' : 'Đóng cửa';
        const rating = Number(court.diemTrungBinh || 0);
        const reviewCount = Number(court.tongDanhGia || 0);
        const giaTu = formatPrice(court.giaTu);
        const imageHtml = imageSrc
            ? `<img src="${imageSrc}" alt="${tenSan}" loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="court-image-fallback" style="display:none;">SportHub</div>`
            : '<div class="court-image-fallback">SportHub</div>';

        return `
            <article class="court-card">
                <div class="court-media">
                    ${imageHtml}
                    <div class="court-badge">${tenLoai}</div>
                    ${giaTu ? `<div class="court-price-tag">Từ ${giaTu}</div>` : ''}
                </div>
                <div class="court-info">
                    <h3>${tenSan}</h3>
                    <p class="court-address"><i class="fa-solid fa-location-dot"></i> ${diaChi}</p>
                    <div class="court-meta">
                        <span class="meta-chip rating-chip">
                            <i class="fa-solid fa-star"></i>
                            ${rating ? rating.toFixed(1) : 'Mới'}
                            <small>(${reviewCount})</small>
                        </span>
                        <span class="meta-chip"><i class="fa-solid fa-credit-card"></i> VNPay</span>
                    </div>
                    <div class="court-footer">
                        <span class="status-tag ${court.tinhTrang === 'HoatDong' ? 'open' : 'closed'}">${tinhTrang}</span>
                        <button class="btn-book" onclick="goToDetail(${court.sanId})">
                            Đặt ngay <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderPagination(pagination) {
    const paginationEl = document.getElementById('courtPagination');
    if (!paginationEl) return;

    const { page, totalPages, total } = pagination;
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    const pages = getPageNumbers(page, totalPages);
    const prevDisabled = page <= 1 ? 'disabled' : '';
    const nextDisabled = page >= totalPages ? 'disabled' : '';

    paginationEl.innerHTML = `
        <div class="pagination-info">Trang ${page} / ${totalPages} · ${total} sân</div>
        <div class="pagination-controls">
            <button class="pagination-btn" ${prevDisabled} onclick="goToPage(${page - 1})" aria-label="Trang trước">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            ${pages.map((p) => {
                if (p === '...') {
                    return '<span class="pagination-ellipsis">…</span>';
                }
                const active = p === page ? 'active' : '';
                return `<button class="pagination-btn ${active}" onclick="goToPage(${p})">${p}</button>`;
            }).join('')}
            <button class="pagination-btn" ${nextDisabled} onclick="goToPage(${page + 1})" aria-label="Trang sau">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function getPageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [1];
    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i += 1) {
        pages.push(i);
    }

    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

function goToPage(page) {
    if (page < 1) return;
    fetchCourts(page);
    document.getElementById('courtSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function searchAction() {
    fetchCourts(1);
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('heroTypeFilter').value = 'all';
    fetchCourts(1);
}

function goToDetail(id) {
    window.location.href = `/frontend/detail.html?sanId=${id}`;
}

function getImageUrl(value) {
    const imagePath = String(value || '').trim();
    if (!imagePath) return '';

    if (imagePath.startsWith('/uploads/courts/')) return imagePath;
    if (imagePath.startsWith('uploads/courts/')) return `/${imagePath}`;
    const uploadIndex = imagePath.replace(/\\/g, '/').indexOf('/uploads/courts/');
    if (uploadIndex >= 0) {
        const normalizedPath = imagePath.replace(/\\/g, '/').slice(uploadIndex);
        const filename = normalizedPath.split('/').pop();
        return filename ? `/uploads/courts/${filename}` : '';
    }

    return '';
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
