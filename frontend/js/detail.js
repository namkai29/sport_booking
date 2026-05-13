const urlParams = new URLSearchParams(window.location.search);
const sanId = urlParams.get('sanId');
let selectedSlot = null;
let availableSlots = [];
let courtName = '';

document.addEventListener('DOMContentLoaded', () => {
    if (!sanId) {
        showToast("Không tìm thấy mã sân!", "error");
        window.location.href = '/frontend/home.html';
        return;
    }

    // 1. Cấu hình ngày mặc định
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('bookingDate');
    dateInput.value = today;
    dateInput.min = today;

    // 2. Chạy lấy dữ liệu
    fetchCourtData();
    loadSlots();

    // Lắng nghe sự kiện đổi ngày
    dateInput.addEventListener('change', loadSlots);
});

// Hàm lấy tất cả thông tin sân từ CSDL
async function fetchCourtData() {
    try {
        const res = await fetch(`/api/bookings/detail/${sanId}`);
        const court = await res.json();
        if (!res.ok) throw new Error(court.message || "Không thể lấy dữ liệu sân");

        courtName = court.tenSan || '';

        // Đổ dữ liệu vào UI
        document.getElementById('courtName').innerText = court.tenSan || 'Sân thể thao';
        document.getElementById('courtType').innerText = court.tenLoai || 'Sân';
        // Lấy cột moTa từ CSDL của bạn
        document.getElementById('courtDesc').innerText = court.moTa || "Sân bóng tiêu chuẩn, đèn sáng cực tốt, phục vụ chu đáo.";
        
        // Kết hợp địa chỉ chi tiết
        const addressParts = [court.diaChiChiTiet, court.quanHuyen, court.tinhThanh].filter(Boolean);
        const fullAddress = addressParts.join(', ') || 'Chưa cập nhật địa chỉ';
        document.getElementById('courtAddr').textContent = fullAddress;
        setCourtImage(court.hinhAnh);

        // Tích hợp bản đồ động
        if (addressParts.length > 0) {
            const mapSearch = encodeURIComponent(fullAddress);
            document.getElementById('googleMap').src = `https://www.google.com/maps?q=${mapSearch}&output=embed`;
        }

    } catch (err) {
        console.error("Lỗi fetchCourtData:", err);
        document.getElementById('courtName').innerText = "Không thể tải thông tin sân";
        document.getElementById('courtAddr').innerText = err.message;
        document.getElementById('courtDesc').innerText = "Vui lòng kiểm tra backend hoặc thử tải lại trang.";
        showToast(err.message, "error");
    }
}

// Hàm load khung giờ (Ma trận màu sắc)
async function loadSlots() {
    const ngay = document.getElementById('bookingDate').value;
    const container = document.getElementById('slotContainer');
    
    container.innerHTML = "<p>Đang kiểm tra lịch trống...</p>";
    selectedSlot = null;
    document.getElementById('btnConfirm').style.display = 'none';
    document.getElementById('priceInfo').style.display = 'none';
    resetConfirmButton();
    try {
        const res = await fetch(`/api/bookings/check-available?sanId=${sanId}&ngay=${ngay}`);
        const slots = await res.json();

        if (!res.ok) {
            throw new Error(slots.message || "Lỗi tải lịch sân");
        }

        if (slots.length === 0) {
            container.innerHTML = "<p>Sân chưa cấu hình khung giờ cho ngày này.</p>";
            return;
        }
        availableSlots = slots;
        container.innerHTML = slots.map(slot => {
            const isAvailable = slot.status === 'Available';
            const statusText = getSlotStatusText(slot.status);
            return `
            <div class="slot-item ${escapeHtml(slot.status)}"
                 ${isAvailable ? `onclick="selectSlot(this, ${slot.khungGioId})"` : ''}
                 title="${escapeHtml(statusText)}">
                <strong>${escapeHtml(slot.gioBatDau.substring(0,5))}</strong>
                <small>${isAvailable ? `${parseInt(slot.finalPrice).toLocaleString()}đ` : escapeHtml(statusText)}</small>
            </div>
        `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    }
}

// Xử lý khi người dùng click chọn giờ
function selectSlot(element, khungGioId) {
    const slot = availableSlots.find(item => item.khungGioId === khungGioId);
    if (!slot) return;
    if (slot.status !== 'Available') return;

    document.querySelectorAll('.slot-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedSlot = slot;

    document.getElementById('priceInfo').style.display = 'flex';
    document.getElementById('totalPrice').innerText = parseInt(slot.finalPrice).toLocaleString() + 'đ';
    document.getElementById('bookingSummary').innerText = `${courtName || 'Sân'} · ${document.getElementById('bookingDate').value} · ${slot.gioBatDau.substring(0,5)} - ${slot.gioKetThuc.substring(0,5)}`;
    document.getElementById('btnConfirm').style.display = 'block';
}

// Gửi yêu cầu đặt sân
async function submitBooking() {
    if (!selectedSlot) return;

    // Logic kiểm tra đăng nhập (nếu bạn đã làm)
    const token = localStorage.getItem('token');
    if (!token) {
        showToast("Vui lòng đăng nhập để đặt sân!", "error");
        window.location.href = '/frontend/index.html';
        return;
    }

     const btnConfirm = document.getElementById('btnConfirm');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = 'ĐANG GỬI YÊU CẦU...';
 
    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sanId: Number(sanId),
                ngayDat: document.getElementById('bookingDate').value,
                khungGioId: selectedSlot.khungGioId
            })
        });
        const data = await res.json();
 
        if (!res.ok) {
            throw new Error(data.message || 'Không thể đặt sân');
        }
 
        showToast(data.message || 'Đặt sân thành công!');
        window.location.href = '/frontend/history.html';
    } catch (err) {
        showToast(err.message, "error");
        resetConfirmButton();
    }
}
 
function resetConfirmButton() {
    const btnConfirm = document.getElementById('btnConfirm');
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = 'XÁC NHẬN ĐẶT SÂN <i class="fa-solid fa-chevron-right"></i>';
}

function setCourtImage(imageUrl) {
    const image = document.getElementById('courtImg');
    const fallback = document.getElementById('courtImgFallback');

    if (!imageUrl) {
        image.style.display = 'none';
        fallback.style.display = 'flex';
        return;
    }

    image.onload = () => {
        fallback.style.display = 'none';
        image.style.display = 'block';
    };
    image.onerror = () => {
        image.style.display = 'none';
        fallback.style.display = 'flex';
    };
    image.src = imageUrl;
}

function getSlotStatusText(status) {
    const labels = {
        Available: 'Còn trống',
        Full: 'Đã đặt',
        Closed: 'Đóng hoặc bảo trì'
    };
    return labels[status] || status;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.innerText = message;
    toast.className = `toast show ${type === 'error' ? 'error' : ''}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.className = 'toast';
    }, 2800);
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