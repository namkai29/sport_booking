const urlParams = new URLSearchParams(window.location.search);
const sanId = urlParams.get('sanId');
let selectedSlot = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!sanId) {
        alert("Không tìm thấy mã sân!");
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
        if (!res.ok) throw new Error("Không thể lấy dữ liệu sân");
        
        const court = await res.json();

        // Đổ dữ liệu vào UI
        document.getElementById('courtName').innerText = court.tenSan;
        document.getElementById('courtType').innerText = court.tenLoai;
        // Lấy cột moTa từ CSDL của bạn
        document.getElementById('courtDesc').innerText = court.moTa || "Sân bóng tiêu chuẩn, đèn sáng cực tốt, phục vụ chu đáo.";
        
        // Kết hợp địa chỉ chi tiết
        const fullAddress = `${court.diaChiChiTiet}, ${court.quanHuyen}, ${court.tinhThanh}`;
        document.getElementById('courtAddr').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${fullAddress}`;

        document.getElementById('courtImg').src = court.hinhAnh || 'https://via.placeholder.com/800x450?text=SportHub';

        // Tích hợp bản đồ động
        const mapSearch = encodeURIComponent(fullAddress);
        document.getElementById('googleMap').src = `https://www.google.com/maps?q=${mapSearch}&output=embed`;

    } catch (err) {
        console.error("Lỗi fetchCourtData:", err);
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

    try {
        const res = await fetch(`/api/bookings/check-available?sanId=${sanId}&ngay=${ngay}`);
        const slots = await res.json();

        if (slots.length === 0) {
            container.innerHTML = "<p>Sân chưa cấu hình khung giờ cho ngày này.</p>";
            return;
        }

        container.innerHTML = slots.map(slot => `
            <div class="slot-item ${slot.status}" 
                 onclick="selectSlot(this, ${JSON.stringify(slot)})">
                <strong>${slot.gioBatDau.substring(0,5)}</strong>
                <small>${parseInt(slot.finalPrice).toLocaleString()}đ</small>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = "<p>Lỗi tải lịch sân.</p>";
    }
}

// Xử lý khi người dùng click chọn giờ
function selectSlot(element, slot) {
    if (slot.status !== 'Available') return;

    document.querySelectorAll('.slot-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedSlot = slot;

    document.getElementById('priceInfo').style.display = 'flex';
    document.getElementById('totalPrice').innerText = parseInt(slot.finalPrice).toLocaleString() + 'đ';
    document.getElementById('btnConfirm').style.display = 'block';
}

// Gửi yêu cầu đặt sân
async function submitBooking() {
    if (!selectedSlot) return;

    // Logic kiểm tra đăng nhập (nếu bạn đã làm)
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Vui lòng đăng nhập để đặt sân!");
        window.location.href = '/frontend/login.html';
        return;
    }

    // Chuyển sang trang thanh toán hoặc gọi API tạo đơn
    alert(`Bạn đã chọn khung giờ ${selectedSlot.gioBatDau}. Chuyển đến trang thanh toán...`);
    // window.location.href = `/frontend/checkout.html?sanId=${sanId}&slotId=${selectedSlot.khungGioId}&date=${document.getElementById('bookingDate').value}`;
}