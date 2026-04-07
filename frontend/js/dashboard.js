// Cấu hình URL Backend
const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token"); // Lấy token lúc login

// Kiểm tra đăng nhập
if (!token) {
    alert("Vui lòng đăng nhập!");
    window.location.href = "login.html";
}

// Biến hỗ trợ thao tác
let isEditMode = false;
let currentEditSanId = null;

// Biến toàn cục ĐƯỢC THÊM MỚI để quản lý trạng thái thời gian biểu
let currentTimetableState = [];

// ==========================================
// 1. LOGIC CHUYỂN TAB GIAO DIỆN
// ==========================================
function switchTab(tabId) {
    // Ẩn tất cả nội dung
    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.classList.add('d-none');
    });
    // Bỏ active ở tất cả menu
    document.querySelectorAll('.list-group-item').forEach(btn => {
        btn.classList.remove('active', 'bg-success');
    });

    // Hiện tab được chọn
    document.getElementById(tabId).classList.remove('d-none');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active', 'bg-success');
    }

    // Đổi tiêu đề Header tương ứng
    const titleMap = {
        'san-tab': 'Quản lý danh sách sân',
        'lich-tab': 'Thiết lập lịch mở cửa',
        'gia-tab': 'Cấu hình bảng giá'
    };
    document.getElementById('page-title').innerText = titleMap[tabId];

    // Load dữ liệu tương ứng khi bấm vào tab
    if(tabId === 'san-tab') loadDanhSachSan();
    if(tabId === 'lich-tab' || tabId === 'gia-tab') loadDropdownSan();
}

// ==========================================
// 2. GỌI API: QUẢN LÝ SÂN
// ==========================================
async function loadDanhSachSan() {
    try {
        const response = await fetch(`${API_URL}/san`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        
        const tbody = document.getElementById("table-san-body");
        tbody.innerHTML = ""; // Xóa loading

        data.forEach(san => {
            tbody.innerHTML += `
                <tr>
                    <td>#${san.sanId}</td>
                    <td class="fw-bold">${san.tenSan}</td>
                    <td><span class="badge bg-secondary">${san.tenLoai}</span></td>
                    <td>${san.diaChiChiTiet}, ${san.quanHuyen}</td>
                    <td><span class="badge bg-success">Đang hoạt động</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editSan(${san.sanId})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteSan(${san.sanId})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Lỗi tải sân:", error);
    }
}

async function loadDropdownSan() {
    const selectLich = document.getElementById('lich-san-select');

    try {
        const response = await fetch(`${API_URL}/san`, { 
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const listSan = await response.json();

        if (!response.ok) {
            console.error("Lỗi lấy dữ liệu sân:", listSan);
            return;
        }

        if (selectLich) {
            selectLich.innerHTML = '<option value="" selected disabled>-- Chọn sân --</option>';
            listSan.forEach(san => {
                selectLich.innerHTML += `<option value="${san.sanId}">${san.tenSan}</option>`;
            });
        }

    } catch (error) {
        console.error("Lỗi khi load danh sách sân vào dropdown:", error);
    }
}

// ==========================================
// 3. GỌI API: TẠO LỊCH BULK & THỜI GIAN BIỂU
// ==========================================

// 👉 HÀM ĐƯỢC THAY ĐỔI: Tải khung giờ và tạo giao diện bấm để tương tác trạng thái
async function loadTimeTable() {
    const sanId = document.getElementById('lich-san-select').value;
    const ngayDuocChon = document.getElementById('lich-ngay').value; // Mong đợi dạng YYYY-MM-DD
    const containerKhungGio = document.getElementById('khung-gio-list');

    if (!sanId || !ngayDuocChon) {
        containerKhungGio.innerHTML = `
            <div class="col-12 text-center text-muted py-4">
                <i class="fa-solid fa-arrow-pointer fa-2x mb-2 d-block text-secondary"></i>
                Vui lòng chọn Sân và Ngày để xem lịch biểu...
            </div>`;
        return;
    }

    try {
        containerKhungGio.innerHTML = '<div class="col-12 text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang nạp thời gian biểu...</div>';

        // 1. Lấy toàn bộ khung giờ gốc
        const resKhungGio = await fetch(`${API_URL}/lich-san/ds-khung-gio`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const listKhungGio = await resKhungGio.json();

        // 2. Lấy lịch đã được thiết lập của sân
        const resLichDaCo = await fetch(`${API_URL}/lich-san/${sanId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const listLichDaCo = await resLichDaCo.json();

        containerKhungGio.innerHTML = ''; 
        currentTimetableState = []; 

        // 3. Tiến hành so khớp và Render
        listKhungGio.forEach(kg => {
            const div = document.createElement('div');
            div.className = 'col-md-4 col-sm-6 mb-3';

            // So khớp ngày và khung giờ (Nhờ Backend DATE_FORMAT nên so sánh chuỗi cực chuẩn)
            const lichTrung = listLichDaCo.find(l => l.khungGioId === kg.khungGioId && l.ngay === ngayDuocChon);
            
            // Xác định trạng thái ban đầu để render
            let currentStatus = 'Trong'; 
            if (lichTrung) {
                currentStatus = lichTrung.trangThai; // Nhận 'Mo', 'Dong' hoặc 'BaoTri' từ DB
            }

            // Đẩy vào mảng state để quản lý click
            currentTimetableState.push({
                khungGioId: kg.khungGioId,
                currentStatus: currentStatus
            });

            // Hàm tạo giao diện giống hệt như ảnh chụp thực tế của bạn
            const buildBoxHtml = (status) => {
                let styleClass = 'bg-white border';
                let labelStatus = 'Chưa thiết lập';
                let badgeClass = 'bg-secondary';

                if (status === 'Mo') { styleClass = 'bg-success-subtle border-success'; labelStatus = 'Mở cửa'; badgeClass = 'bg-success'; }
                else if (status === 'Dong') { styleClass = 'bg-danger-subtle border-danger'; labelStatus = 'Đóng cửa'; badgeClass = 'bg-danger'; }
                else if (status === 'BaoTri') { styleClass = 'bg-warning-subtle border-warning'; labelStatus = 'Bảo trì'; badgeClass = 'bg-warning'; }

                return `
                    <div class="p-2 rounded d-flex justify-content-between align-items-center timetable-item shadow-sm h-100 ${styleClass}" 
                         style="cursor: pointer; transition: 0.2s;"
                         onclick="toggleStatus(this, ${kg.khungGioId})">
                        <div>
                            <span class="fw-bold small d-block">${kg.gioBatDau.slice(0, 5)} - ${kg.gioKetThuc.slice(0, 5)}</span>
                            <span class="badge ${badgeClass} mt-1">${labelStatus}</span>
                        </div>
                        <i class="fa-solid fa-arrows-rotate text-muted" title="Nhấp để đổi trạng thái"></i>
                    </div>
                `;
            };

            div.innerHTML = buildBoxHtml(currentStatus);
            containerKhungGio.appendChild(div);
        });

    } catch (error) {
        console.error("Lỗi nạp thời gian biểu:", error);
        containerKhungGio.innerHTML = '<div class="col-12 text-danger text-center py-4">Lỗi hệ thống khi nạp lịch!</div>';
    }
}

// 👉 HÀM MỚI: Xử lý xoay vòng trạng thái ngay trên UI khi click (Trong -> Mo -> Dong -> BaoTri)
function toggleStatus(element, khungGioId) {
    const item = currentTimetableState.find(x => x.khungGioId === khungGioId);
    if (!item) return;

    // Quy luật xoay vòng: Chưa thiết lập (Trong) -> Mở -> Đóng -> Bảo trì -> Trở lại chưa thiết lập
    const flow = {
        'Trong': 'Mo',
        'Mo': 'Dong',
        'Dong': 'BaoTri',
        'BaoTri': 'Trong'
    };

    const nextStatus = flow[item.currentStatus];
    item.currentStatus = nextStatus; // Cập nhật lại dữ liệu trong mảng

    // Xóa bỏ tất cả các class màu cũ
    element.classList.remove('bg-success-subtle', 'border-success', 'bg-danger-subtle', 'border-danger', 'bg-warning-subtle', 'border-warning', 'bg-white', 'border');

    let styleClass = 'bg-white border';
    let labelStatus = 'Chưa thiết lập';
    let badgeClass = 'bg-secondary';

    // Tạo style mới dựa trên trạng thái mới
    if (nextStatus === 'Mo') { styleClass = 'bg-success-subtle border-success'; labelStatus = 'Mở cửa'; badgeClass = 'bg-success'; }
    else if (nextStatus === 'Dong') { styleClass = 'bg-danger-subtle border-danger'; labelStatus = 'Đóng cửa'; badgeClass = 'bg-danger'; }
    else if (nextStatus === 'BaoTri') { styleClass = 'bg-warning-subtle border-warning'; labelStatus = 'Bảo trì'; badgeClass = 'bg-warning'; }

    // Re-apply style vào thẻ HTML
    element.classList.add(...styleClass.split(' '));
    element.querySelector('.badge').className = `badge ${badgeClass} mt-1`;
    element.querySelector('.badge').innerText = labelStatus;
}

// Lắng nghe sự kiện khi thay đổi Sân hoặc Ngày để tự load lại Thời gian biểu
document.getElementById('lich-ngay').addEventListener('change', loadTimeTable);
document.getElementById('lich-san-select').addEventListener('change', loadTimeTable);

// 👉 HÀM ĐƯỢC THAY ĐỔI: Nút submit Lưu lịch (Gửi các khung giờ đã thay đổi)
document.getElementById('form-bulk-lich').addEventListener('submit', async (e) => {
    e.preventDefault();

    const sanId = document.getElementById('lich-san-select').value;
    const ngay = document.getElementById('lich-ngay').value;
    const trangThaiApDung = document.getElementById('lich-trang-thai')?.value; // Ô select "Mở cửa (Hoạt động)"
    
    if (!sanId) { alert("Vui lòng chọn sân!"); return; }

    let listUpdate = [];

    // KIỂM TRA: Nếu người dùng click lẻ tẻ trên bảng "Thời gian biểu trong ngày"
    const clickDuyNhat = currentTimetableState.filter(item => item.currentStatus !== 'Trong');

    if (clickDuyNhat.length > 0) {
        // Ưu tiên lấy dữ liệu đã chỉnh sửa bằng tay trên biểu đồ
        listUpdate = clickDuyNhat.map(item => ({
            khungGioId: item.khungGioId,
            trangThai: item.currentStatus
        }));
    } else if (trangThaiApDung) {
        // Nếu biểu đồ trống trơn, áp dụng quy tắc "Tạo hàng loạt" từ ô Select cho TẤT CẢ các khung giờ
        listUpdate = currentTimetableState.map(item => ({
            khungGioId: item.khungGioId,
            trangThai: trangThaiApDung
        }));
    }

    if (listUpdate.length === 0) {
        alert("Không có khung giờ nào được chọn để thiết lập!");
        return;
    }

    const reqBody = { sanId: parseInt(sanId), ngay: ngay, list: listUpdate };

    try {
        const response = await fetch(`${API_URL}/lich-san/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(reqBody)
        });

        if (response.ok) {
            alert("Cập nhật trạng thái sân thành công!");
            loadTimeTable(); // Gọi lại để đồng bộ hóa giao diện và đổ màu đúng chuẩn
        } else {
            const result = await response.json();
            alert(result.message || "Lỗi khi thiết lập lịch!");
        }
    } catch (error) {
        console.error("Lỗi bulk lịch:", error);
        alert("Lỗi hệ thống khi lưu lịch!");
    }
});

// Hàm đăng xuất
function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

// Khởi chạy khi trang load (Hệ thống Địa lý Tỉnh/Huyện/Xã)
document.addEventListener('DOMContentLoaded', async () => {
    loadDanhSachSan(); 

    const selectTinh = document.getElementById('tinhThanh');
    const selectQuan = document.getElementById('quanHuyen');
    const selectPhuong = document.getElementById('phuongXa');

    // Tải danh sách Tỉnh/Thành phố từ API
    try {
        const response = await fetch('https://provinces.open-api.vn/api/p/');
        const provinces = await response.json();
        
        selectTinh.innerHTML = '<option value="" selected disabled>-- Chọn Tỉnh/Thành --</option>';
        provinces.forEach(province => {
            selectTinh.innerHTML += `<option value="${province.code}" data-name="${province.name}">${province.name}</option>`;
        });
    } catch (error) {
        selectTinh.innerHTML = '<option value="" disabled>Không thể tải dữ liệu</option>';
        console.error('Lỗi tải tỉnh thành:', error);
    }

    // Lắng nghe khi chọn Tỉnh -> Load Quận/Huyện
    selectTinh.addEventListener('change', async function() {
        const provinceCode = this.value;
        
        selectQuan.innerHTML = '<option value="" selected disabled>Đang tải...</option>';
        selectQuan.disabled = true;
        selectPhuong.innerHTML = '<option value="" selected disabled>-- Chọn Phường/Xã --</option>';
        selectPhuong.disabled = true;

        try {
            const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
            const data = await response.json();
            
            selectQuan.innerHTML = '<option value="" selected disabled>-- Chọn Quận/Huyện --</option>';
            data.districts.forEach(district => {
                selectQuan.innerHTML += `<option value="${district.code}" data-name="${district.name}">${district.name}</option>`;
            });
            selectQuan.disabled = false; 
        } catch (error) {
            console.error('Lỗi tải quận huyện:', error);
        }
    });

    // Lắng nghe khi chọn Quận/Huyện -> Load Phường/Xã
    selectQuan.addEventListener('change', async function() {
        const districtCode = this.value;
        
        selectPhuong.innerHTML = '<option value="" selected disabled>Đang tải...</option>';
        selectPhuong.disabled = true;

        try {
            const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = await response.json();
            
            selectPhuong.innerHTML = '<option value="" selected disabled>-- Chọn Phường/Xã --</option>';
            data.wards.forEach(ward => {
                selectPhuong.innerHTML += `<option value="${ward.code}" data-name="${ward.name}">${ward.name}</option>`;
            });
            selectPhuong.disabled = false; 
        } catch (error) {
            console.error('Lỗi tải phường xã:', error);
        }
    });
});

// Thêm/Sửa sân
document.getElementById('form-them-san').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tinhThanh = document.getElementById('tinhThanh').options[document.getElementById('tinhThanh').selectedIndex].getAttribute('data-name');
    const quanHuyen = document.getElementById('quanHuyen').options[document.getElementById('quanHuyen').selectedIndex].getAttribute('data-name');
    const phuongXa = document.getElementById('phuongXa').options[document.getElementById('phuongXa').selectedIndex].getAttribute('data-name');

    const rawBody = {
        tenSan: document.getElementById('tenSan').value,
        loaiSanId: parseInt(document.getElementById('loaiSanId').value),
        tinhThanh: tinhThanh,
        quanHuyen: quanHuyen,
        phuongXa: phuongXa,
        diaChiChiTiet: document.getElementById('diaChiChiTiet').value,
        moTa: document.getElementById('moTa').value,
        hinhAnh: document.getElementById('hinhAnh').value
    };

    let apiUrl = `${API_URL}/san`;
    let apiMethod = "POST";

    if (isEditMode) {
        apiUrl = `${API_URL}/san/${currentEditSanId}`;
        apiMethod = "PUT"; 
    }

    try {
        const res = await fetch(apiUrl, {
            method: apiMethod,
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify(rawBody)
        });
        
        const result = await res.json();
        
        if(res.ok) {
            alert(isEditMode ? "Cập nhật sân thành công!" : "Thêm sân thành công!");
            const modalElement = document.getElementById('modalThemSan');
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
            
            document.getElementById('form-them-san').reset();
            loadDanhSachSan();
        } else {
            alert(result.message || "Đã có lỗi xảy ra");
        }
    } catch (err) {
        console.error("Lỗi:", err);
        alert("Lỗi hệ thống!");
    }
});

// Hàm xóa sân
async function deleteSan(sanId) {
    const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa sân #${sanId} không? Hành động này không thể hoàn tác!`);
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/san/${sanId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const result = await response.json();

        if (response.ok) {
            alert("Xóa sân thành công!");
            loadDanhSachSan(); 
        } else {
            alert(result.message || "Không thể xóa sân lúc này");
        }
    } catch (error) {
        console.error("Lỗi xóa sân:", error);
        alert("Lỗi hệ thống khi thực hiện xóa!");
    }
}

// Hàm sửa sân
async function editSan(sanId) {
    isEditMode = true;
    currentEditSanId = sanId;

    try {
        const response = await fetch(`${API_URL}/san/${sanId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const sanData = await response.json();

        if (!response.ok) {
            alert("Không thể lấy thông tin chi tiết của sân!");
            return;
        }

        document.getElementById('modalThemSanLabel').innerHTML = `<i class="fa-solid fa-pen-to-square me-2"></i>Cập nhật thông tin sân #${sanId}`;
        const submitBtn = document.querySelector('#form-them-san button[type="submit"]');
        submitBtn.innerHTML = `<i class="fa-solid fa-save me-2"></i>Cập nhật ngay`;
        submitBtn.classList.remove('btn-success');
        submitBtn.classList.add('btn-primary');

        document.getElementById('tenSan').value = sanData.tenSan;
        document.getElementById('loaiSanId').value = sanData.loaiSanId;
        document.getElementById('diaChiChiTiet').value = sanData.diaChiChiTiet;
        document.getElementById('moTa').value = sanData.moTa || '';
        document.getElementById('hinhAnh').value = sanData.hinhANH || '';

        const selectTinh = document.getElementById('tinhThanh');
        const selectQuan = document.getElementById('quanHuyen');
        const selectPhuong = document.getElementById('phuongXa');

        const optionTinh = Array.from(selectTinh.options).find(opt => opt.getAttribute('data-name') === sanData.tinhThanh);
        
        if (optionTinh) {
            selectTinh.value = optionTinh.value; 
            const eventChangeTinh = new Event('change');
            selectTinh.dispatchEvent(eventChangeTinh);

            setTimeout(async () => {
                const optionQuan = Array.from(selectQuan.options).find(opt => opt.getAttribute('data-name') === sanData.quanHuyen);
                if (optionQuan) {
                    selectQuan.value = optionQuan.value;
                    const eventChangeQuan = new Event('change');
                    selectQuan.dispatchEvent(eventChangeQuan);

                    setTimeout(() => {
                        const optionPhuong = Array.from(selectPhuong.options).find(opt => opt.getAttribute('data-name') === sanData.phuongXa);
                        if (optionPhuong) selectPhuong.value = optionPhuong.value;
                    }, 500);
                }
            }, 500);
        }

        const modalElement = document.getElementById('modalThemSan');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

    } catch (error) {
        console.error("Lỗi khi sửa sân:", error);
        alert("Có lỗi hệ thống khi nạp dữ liệu sửa!");
    }
}

// Chế độ thêm mới
function openAddMode() {
    isEditMode = false;
    currentEditSanId = null;
    
    document.getElementById('modalThemSanLabel').innerHTML = `<i class="fa-solid fa-plus-circle me-2"></i>Thêm sân mới`;
    const submitBtn = document.querySelector('#form-them-san button[type="submit"]');
    submitBtn.innerHTML = `<i class="fa-solid fa-save me-2"></i>Lưu thông tin`;
    submitBtn.classList.remove('btn-primary');
    submitBtn.classList.add('btn-success');
    
    document.getElementById('form-them-san').reset();
}

// Bắt buộc đẩy phạm vi toàn cục ra cho HTML gọi được
window.editSan = editSan;
window.deleteSan = deleteSan;
window.openAddMode = openAddMode;
window.switchTab = switchTab;
window.toggleStatus = toggleStatus; // Gắn hàm chuyển trạng thái vào window