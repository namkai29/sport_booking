// Cấu hình URL Backend

const API_URL = "/api";
const token = localStorage.getItem("token"); // Lấy token lúc login

// Kiểm tra đăng nhập
if (!token) {
    window.location.href = "/frontend/index.html";
}

// Biến hỗ trợ thao tác
let isEditMode = false;
let currentEditSanId = null;
let currentEditImage = "";
let ownerCourts = [];
let ownerBookings = [];
let ownerBookingSummary = {};
let previewObjectUrl = "";
let addressSearchTimer = null;
let addressSearchController = null;
let isPrefillingAddress = false;

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
    const activeTrigger = typeof event !== "undefined" ? event.currentTarget : null;
    if (activeTrigger) {
        activeTrigger.classList.add('active', 'bg-success');
    }

    // Đổi tiêu đề Header tương ứng
    const titleMap = {
        'san-tab': 'Quản lý danh sách sân',
        'lich-tab': 'Thiết lập lịch mở cửa',
        'gia-tab': 'Cấu hình bảng giá',
        'booking-tab': 'Quản lý đơn đặt sân'
    };
    document.getElementById('page-title').innerText = titleMap[tabId];

    // Load dữ liệu tương ứng khi bấm vào tab
    if(tabId === 'san-tab') loadDanhSachSan();
    if(tabId === 'lich-tab' || tabId === 'gia-tab') loadDropdownSan();
    if(tabId === 'booking-tab') loadOwnerBookings();
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
        if (!response.ok) {
            throw new Error(data.message || "Không thể tải danh sách sân");
        }
        
        const tbody = document.getElementById("table-san-body");
        tbody.innerHTML = ""; // Xóa loading

        ownerCourts = Array.isArray(data) ? data : [];
        updateCourtMetrics();

        if (ownerCourts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Bạn chưa có sân nào. Hãy thêm sân đầu tiên để bắt đầu nhận lịch đặt.</td></tr>';
            return;
        }

        tbody.innerHTML = ownerCourts.map(san => {
            const tenSan = escapeHtml(san.tenSan);
            const tenLoai = escapeHtml(san.tenLoai);
            const diaChi = escapeHtml([san.diaChiChiTiet, san.phuongXa, san.quanHuyen].filter(Boolean).join(", ") || "Chưa cập nhật địa chỉ");
            const viDo = san.viDo ? escapeHtml(san.viDo) : "—";
            const kinhDo = san.kinhDo ? escapeHtml(san.kinhDo) : "—";
            const courtImage = getImageUrl(san.hinhAnh);
            const isActive = san.tinhTrang === "HoatDong";
            const statusClass = isActive ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary";
            const statusText = isActive ? "Đang hoạt động" : "Tạm dừng";
            const imageHtml = courtImage
                ? `<img class="owner-court-thumb" src="${escapeHtml(courtImage)}" alt="${tenSan}" onerror="this.outerHTML='<div class=&quot;owner-court-fallback&quot;>SB</div>'">`
                : '<div class="owner-court-fallback">SB</div>';
            return `
                <tr>
                    <td>${imageHtml}</td>
                    <td>
                        <div class="fw-bold">${tenSan}</div>
                        <small class="text-muted">#${san.sanId}</small>
                    </td>
                    <td><span class="badge bg-secondary">${tenLoai}</span></td>
                    <td>
                        ${diaChi}
                        <br>
                        <small class="text-muted"><i class="fa-solid fa-location-dot"></i> ${viDo}, ${kinhDo}</small>
                    </td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editSan(${san.sanId})"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteSan(${san.sanId})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (error) {
        console.error("Lỗi tải sân:", error);
        document.getElementById("table-san-body").innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Không thể tải danh sách sân.</td></tr>';
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
                  selectLich.innerHTML += `<option value="${san.sanId}">${escapeHtml(san.tenSan)}</option>`;
            });
        }

    } catch (error) {
        console.error("Lỗi khi load danh sách sân vào dropdown:", error);
    }
}

// ==========================================
// 3. GỌI API: TẠO LỊCH BULK & THỜI GIAN BIỂU
// ==========================================


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

// Hàm submit Lưu lịch (Gửi các khung giờ đã thay đổi)
document.getElementById('form-bulk-lich').addEventListener('submit', async (e) => {
    e.preventDefault();

    const sanId = document.getElementById('lich-san-select').value;
    const ngay = document.getElementById('lich-ngay').value;
    const trangThaiApDung = document.getElementById('lich-trang-thai')?.value; // Ô select "Mở cửa (Hoạt động)"
    
    if (!sanId) {
        showToast("Vui lòng chọn sân!", "warning");
        return;
    }

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
        showToast("Không có khung giờ nào được chọn để thiết lập!", "warning");
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
            showToast("Cập nhật trạng thái sân thành công!", "success");
            loadTimeTable(); // Gọi lại để đồng bộ hóa giao diện và đổ màu đúng chuẩn
        } else {
            const result = await response.json();
            showToast(result.message || "Lỗi khi thiết lập lịch!", "danger");
        }
    } catch (error) {
        console.error("Lỗi bulk lịch:", error);
        showToast("Lỗi hệ thống khi lưu lịch!", "danger");
    }
});

// Hàm đăng xuất
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/frontend/index.html";
}

// Khởi chạy khi trang load (Hệ thống Địa lý Tỉnh/Huyện/Xã)
document.addEventListener('DOMContentLoaded', async () => {
    loadDanhSachSan(); 
    loadOwnerBookings();

    const selectTinh = document.getElementById('tinhThanh');
    const selectQuan = document.getElementById('quanHuyen');
    const selectPhuong = document.getElementById('phuongXa');
    const inputDiaChi = document.getElementById('diaChiChiTiet');

    // 1. Tải danh sách Tỉnh/Thành phố từ API
    try {
        const response = await fetch('https://provinces.open-api.vn/api/p/');
        const provinces = await response.json();
        
        selectTinh.innerHTML = '<option value="" selected disabled>-- Chọn Tỉnh/Thành --</option>';
        provinces.forEach(province => {
            selectTinh.innerHTML += `<option value="${province.code}" data-name="${escapeHtml(province.name)}">${escapeHtml(province.name)}</option>`;
        });
    } catch (error) {
        selectTinh.innerHTML = '<option value="" disabled>Không thể tải dữ liệu</option>';
        console.error('Lỗi tải tỉnh thành:', error);
    }

    // 2. Lắng nghe khi chọn Tỉnh -> Load Quận/Huyện
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
                selectQuan.innerHTML += `<option value="${district.code}" data-name="${escapeHtml(district.name)}">${escapeHtml(district.name)}</option>`;
            });
            selectQuan.disabled = false; 
            
            // Tự động nhảy Map về trung tâm Tỉnh khi chọn xong Tỉnh
            scheduleMapAddressUpdate();
        } catch (error) {
            console.error('Lỗi tải quận huyện:', error);
        }
    });

    // 3. Lắng nghe khi chọn Quận/Huyện -> Load Phường/Xã
    selectQuan.addEventListener('change', async function() {
        const districtCode = this.value;
        
        selectPhuong.innerHTML = '<option value="" selected disabled>Đang tải...</option>';
        selectPhuong.disabled = true;

        try {
            const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = await response.json();
            
            selectPhuong.innerHTML = '<option value="" selected disabled>-- Chọn Phường/Xã --</option>';
            data.wards.forEach(ward => {
                 selectPhuong.innerHTML += `<option value="${ward.code}" data-name="${escapeHtml(ward.name)}">${escapeHtml(ward.name)}</option>`;
            });
            selectPhuong.disabled = false; 

            // Tự động nhảy Map về trung tâm Quận khi chọn xong Quận
            scheduleMapAddressUpdate();
        } catch (error) {
            console.error('Lỗi tải phường xã:', error);
        }
    });

    // 4. Lắng nghe khi chọn Phường/Xã
    selectPhuong.addEventListener('change', scheduleMapAddressUpdate);

    // 5. Lắng nghe khi nhập xong địa chỉ cụ thể (Rời chuột khỏi ô nhập)
    if (inputDiaChi) {
        inputDiaChi.addEventListener('input', scheduleMapAddressUpdate);
        inputDiaChi.addEventListener('blur', updateMapFromAddress);
    }
});
// Thêm/Sửa sân
document.getElementById('form-them-san').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tinhThanh = document.getElementById('tinhThanh').selectedOptions[0]?.getAttribute('data-name');
    const quanHuyen = document.getElementById('quanHuyen').selectedOptions[0]?.getAttribute('data-name');
    const phuongXa = document.getElementById('phuongXa').selectedOptions[0]?.getAttribute('data-name');

    if (!tinhThanh || !quanHuyen || !phuongXa) {
        showToast("Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã.", "warning");
        return;
    }

    const formData = new FormData();
    formData.append("tenSan", document.getElementById('tenSan').value);
    formData.append("loaiSanId", parseInt(document.getElementById('loaiSanId').value));
    formData.append("tinhThanh", tinhThanh);
    formData.append("quanHuyen", quanHuyen);
    formData.append("phuongXa", phuongXa);
    formData.append("diaChiChiTiet", document.getElementById('diaChiChiTiet').value);
    formData.append("moTa", document.getElementById('moTa').value);
    formData.append("kinhDo", parseFloat(document.getElementById('kinhDo').value) || 0);
    formData.append("viDo", parseFloat(document.getElementById('viDo').value) || 0);

    const imageFile = document.getElementById('hinhAnhFile').files[0];
    if (imageFile) {
        formData.append("hinhAnhFile", imageFile);
    }

    let apiUrl = `${API_URL}/san`;
    let apiMethod = "POST";

    if (isEditMode) {
        apiUrl = `${API_URL}/san/${currentEditSanId}`;
        apiMethod = "PUT"; 
    }

    try {
        setFormSubmitting(true);
        const res = await fetch(apiUrl, {
            method: apiMethod,
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        
        const result = await res.json();
        
        if(res.ok) {
            showToast(isEditMode ? "Cập nhật sân thành công!" : "Thêm sân thành công!", "success");
            const modalElement = document.getElementById('modalThemSan');
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
            
            document.getElementById('form-them-san').reset();
            document.getElementById('hinhAnhFile').value = "";
            currentEditImage = "";
            updateImagePreview("");
            loadDanhSachSan();
        } else {
            showToast(result.message || "Đã có lỗi xảy ra", "danger");
        }
    } catch (err) {
        console.error("Lỗi:", err);
        showToast("Lỗi hệ thống!", "danger");
    } finally {
        setFormSubmitting(false);
    }
});

// Hàm xóa sân
async function deleteSan(sanId) {
    const court = ownerCourts.find(item => Number(item.sanId) === Number(sanId));
    const courtName = court?.tenSan ? `“${court.tenSan}”` : `#${sanId}`;
    const confirmDelete = await showConfirm({
        title: "Xóa sân?",
        message: `Bạn có chắc chắn muốn xóa sân ${courtName} không? Hành động này không thể hoàn tác.`,
        confirmText: "Xóa sân",
        confirmClass: "btn-danger"
    });
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/san/${sanId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const result = await response.json();

        if (response.ok) {
            showToast("Xóa sân thành công!", "success");
            loadDanhSachSan(); 
        } else {
            showToast(result.message || "Không thể xóa sân lúc này", "danger");
        }
    } catch (error) {
        console.error("Lỗi xóa sân:", error);
        showToast("Lỗi hệ thống khi thực hiện xóa!", "danger");
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
            showToast("Không thể lấy thông tin chi tiết của sân!", "danger");
            return;
        }

        document.getElementById('modalThemSanLabel').innerHTML = `<i class="fa-solid fa-pen-to-square me-2"></i>Cập nhật thông tin sân #${sanId}`;
        const submitBtn = document.querySelector('#form-them-san button[type="submit"]');
        submitBtn.innerHTML = `<i class="fa-solid fa-save me-2"></i>Cập nhật ngay`;
        submitBtn.dataset.defaultHtml = submitBtn.innerHTML;
        submitBtn.classList.remove('btn-success');
        submitBtn.classList.add('btn-primary');

        document.getElementById('tenSan').value = sanData.tenSan;
        document.getElementById('loaiSanId').value = sanData.loaiSanId;
        document.getElementById('diaChiChiTiet').value = sanData.diaChiChiTiet;
        document.getElementById('moTa').value = sanData.moTa || '';
        currentEditImage = sanData.hinhAnh || '';
        updateImagePreview(currentEditImage);
        document.getElementById('kinhDo').value = sanData.kinhDo || '';
        document.getElementById('viDo').value = sanData.viDo || '';

        const selectTinh = document.getElementById('tinhThanh');
        const selectQuan = document.getElementById('quanHuyen');
        const selectPhuong = document.getElementById('phuongXa');

        const optionTinh = Array.from(selectTinh.options).find(opt => opt.getAttribute('data-name') === sanData.tinhThanh);
        
        isPrefillingAddress = true;
        setTimeout(() => {
            if (isPrefillingAddress) {
                isPrefillingAddress = false;
                centerMapFromExistingCoordinates();
            }
        }, 3000);
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
                        isPrefillingAddress = false;
                        centerMapFromExistingCoordinates();
                    }, 500);
                } else {
                    isPrefillingAddress = false;
                    centerMapFromExistingCoordinates();
                }
            }, 500);
        } else {
            isPrefillingAddress = false;
            centerMapFromExistingCoordinates();
        }

        const modalElement = document.getElementById('modalThemSan');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

    } catch (error) {
        console.error("Lỗi khi sửa sân:", error);
        showToast("Có lỗi hệ thống khi nạp dữ liệu sửa!", "danger");
    }
}

// Chế độ thêm mới
function openAddMode() {
    isEditMode = false;
    currentEditSanId = null;
    
    document.getElementById('modalThemSanLabel').innerHTML = `<i class="fa-solid fa-plus-circle me-2"></i>Thêm sân mới`;
    const submitBtn = document.querySelector('#form-them-san button[type="submit"]');
    submitBtn.innerHTML = `<i class="fa-solid fa-save me-2"></i>Lưu thông tin`;
    submitBtn.dataset.defaultHtml = submitBtn.innerHTML;
    submitBtn.classList.remove('btn-primary');
    submitBtn.classList.add('btn-success');
    
    document.getElementById('form-them-san').reset();
    document.getElementById('hinhAnhFile').value = "";
    document.getElementById('quanHuyen').innerHTML = '<option value="" selected disabled>-- Chọn Quận/Huyện --</option>';
    document.getElementById('quanHuyen').disabled = true;
    document.getElementById('phuongXa').innerHTML = '<option value="" selected disabled>-- Chọn Phường/Xã --</option>';
    document.getElementById('phuongXa').disabled = true;
    document.getElementById('kinhDo').value = "";
    document.getElementById('viDo').value = "";
    currentEditImage = "";
    updateImagePreview("");
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
}
// Hàm áp dụng trạng thái hàng loạt (Dùng cho 2 nút bấm Chọn tất cả / Hủy)
function applyStatusToAll(isApply) {
    const selectedStatus = document.getElementById('lich-trang-thai').value; // 'Mo', 'Dong', 'BaoTri'
    const container = document.getElementById('khung-gio-list');
    const items = container.querySelectorAll('.timetable-item');

    if (items.length === 0 || currentTimetableState.length === 0) {
        showToast("Vui lòng chọn Sân và Ngày trước!", "warning");
        return;
    }

    currentTimetableState.forEach((item, index) => {
        // Nếu isApply = true: lấy giá trị từ ô Select. Nếu false: đưa về 'Trong' (Chưa thiết lập)
        const nextStatus = isApply ? selectedStatus : 'Trong';
        
        // 1. Cập nhật dữ liệu ngầm
        item.currentStatus = nextStatus;

        // 2. Cập nhật giao diện (Tìm div tương ứng)
        const element = items[index];
        
        // Reset class màu
        element.classList.remove('bg-success-subtle', 'border-success', 'bg-danger-subtle', 'border-danger', 'bg-warning-subtle', 'border-warning', 'bg-white', 'border');

        let styleClass = 'bg-white border';
        let labelStatus = 'Chưa thiết lập';
        let badgeClass = 'bg-secondary';

        if (nextStatus === 'Mo') { styleClass = 'bg-success-subtle border-success'; labelStatus = 'Mở cửa'; badgeClass = 'bg-success'; }
        else if (nextStatus === 'Dong') { styleClass = 'bg-danger-subtle border-danger'; labelStatus = 'Đóng cửa'; badgeClass = 'bg-danger'; }
        else if (nextStatus === 'BaoTri') { styleClass = 'bg-warning-subtle border-warning'; labelStatus = 'Bảo trì'; badgeClass = 'bg-warning'; }

        element.classList.add(...styleClass.split(' '));
        element.querySelector('.badge').className = `badge ${badgeClass} mt-1`;
        element.querySelector('.badge').innerText = labelStatus;
    });
}


// thiết lập giá 
// ==========================================
// 4. GỌI API: THIẾT LẬP GIÁ (GIA-TAB)
// ==========================================

// Hàm load danh sách khung giờ vào Dropdown của Tab Giá
async function loadKhungGioGia() {
    const selectKhung = document.getElementById('gia-khung-select');
    if (!selectKhung) return;

    try {
        const res = await fetch(`${API_URL}/lich-san/ds-khung-gio`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        selectKhung.innerHTML = '<option value="" selected disabled>-- Chọn khung giờ --</option>';
        data.forEach(kg => {
            selectKhung.innerHTML += `<option value="${kg.khungGioId}">${kg.gioBatDau.slice(0, 5)} - ${kg.gioKetThuc.slice(0, 5)}</option>`;
        });
    } catch (error) {
        console.error("Lỗi tải khung giờ cho tab giá:", error);
    }
}

// Cập nhật hàm loadDropdownSan hiện có của bạn để đổ data vào cả gia-san-select
const originalLoadDropdownSan = loadDropdownSan;
loadDropdownSan = async function() {
    await originalLoadDropdownSan(); // Gọi hàm cũ để load tab lịch
    
    const selectGia = document.getElementById('gia-san-select');
    if (selectGia) {
        const response = await fetch(`${API_URL}/san`, { 
            headers: { "Authorization": `Bearer ${token}` }
        });
        const listSan = await response.json();
        
        selectGia.innerHTML = '<option value="" selected disabled>-- Chọn sân --</option>';
        listSan.forEach(san => {
            selectGia.innerHTML += `<option value="${san.sanId}">${escapeHtml(san.tenSan)}</option>`;
        });
    }
    loadKhungGioGia(); // Load luôn khung giờ cho dropdown giá
};

// Xử lý Submit Form Thiết Lập Giá
document.getElementById('form-bulk-gia')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // SỬA LỖI TẠI ĐÂY: Khai báo btn và originalText ở phạm vi hàm để finally có thể đọc được
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML; 

    const sanId = document.getElementById('gia-san-select').value;
    const khungGioId = document.getElementById('gia-khung-select').value;
    const giaTien = document.getElementById('gia-tien').value;
    
    const checkboxes = document.querySelectorAll('.check-thu:checked');
    const thuDuocChon = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (!sanId || !khungGioId || !giaTien || thuDuocChon.length === 0) {
        showToast("Vui lòng nhập đầy đủ thông tin và chọn ít nhất 1 thứ!", "warning");
        return;
    }

    try {
        // Hiệu ứng loading
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
        btn.disabled = true;

        const listBulkGia = thuDuocChon.map(thu => ({
            khungGioId: parseInt(khungGioId),
            thuTrongTuan: thu, // Đã đồng bộ với DB (thuTrongTuan)
            gia: parseFloat(giaTien)
        }));

        const res = await fetch(`${API_URL}/gia-san/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                sanId: parseInt(sanId),
                list: listBulkGia
            })
        });

        if (res.ok) {
            showToast("Thành công! Đã cập nhật giá.", "success");
            loadPriceTable(sanId); 
            document.getElementById('gia-tien').value = "";
            checkboxes.forEach(cb => cb.checked = false);
        } else {
            const result = await res.json();
            showToast(result.message || "Lỗi khi cập nhật giá", "danger");
        }
    } catch (error) {
        console.error("Lỗi gửi API giá:", error);
        showToast("Lỗi kết nối máy chủ!", "danger");
    } finally {
        // Trả lại trạng thái nút bấm ban đầu
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
// Hàm tải và hiển thị bảng giá
async function loadPriceTable(sanId) {
    const tbody = document.getElementById("table-price-body");
    const thead = document.querySelector("#gia-tab table thead");
    if (!sanId || !tbody) return;

    // Cập nhật tiêu đề bảng để hiển thị đủ các thứ (nếu HTML chưa có)
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Khung giờ</th>
                <th class="text-center">T2</th>
                <th class="text-center">T3</th>
                <th class="text-center">T4</th>
                <th class="text-center">T5</th>
                <th class="text-center">T6</th>
                <th class="text-center text-danger">T7</th>
                <th class="text-center text-danger">CN</th>
                <th class="text-center">Thao tác</th>
            </tr>
        `;
    }

    try {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</td></tr>';
        
        const res = await fetch(`${API_URL}/gia-san/${sanId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Sân này chưa được thiết lập giá.</td></tr>';
            return;
        }

        // Lấy danh sách các khung giờ duy nhất và sắp xếp theo thời gian
        const distinctKhungGio = [...new Set(data.map(item => item.khungGioId))];
        
        tbody.innerHTML = "";
        distinctKhungGio.forEach(kgId => {
            const rowData = data.filter(d => d.khungGioId === kgId);
            const info = rowData[0]; // Lấy thông tin giờ từ bản ghi đầu tiên của nhóm
            
            let rowHtml = `
                <tr>
                    <td class="fw-bold text-primary">${info.gioBatDau.slice(0,5)} - ${info.gioKetThuc.slice(0,5)}</td>
            `;

            // Duyệt từ Thứ 2 (2) đến Chủ Nhật (8)
            for (let thu = 2; thu <= 8; thu++) {
                const priceMatch = rowData.find(d => d.thuTrongTuan === thu);
                const displayPrice = priceMatch 
                    ? `<span class="fw-medium">${Number(priceMatch.gia).toLocaleString()}</span>` 
                    : `<span class="text-muted small">-</span>`;
                
                const textColor = thu >= 7 ? 'text-danger' : ''; // Làm nổi bật T7, CN
                rowHtml += `<td class="text-center ${textColor}">${displayPrice}</td>`;
            }

            // Cột thao tác xóa
            rowHtml += `
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deletePriceByGroup(${sanId}, ${kgId})">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>`;
            
            tbody.innerHTML += rowHtml;
        });
    } catch (error) {
        console.error("Lỗi load bảng giá:", error);
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Lỗi nạp dữ liệu bảng giá!</td></tr>';
    }
}
// Lắng nghe sự kiện đổi sân ở Tab Giá để tự nạp bảng
document.getElementById('gia-san-select')?.addEventListener('change', function() {
    loadPriceTable(this.value);
});

// Hàm làm mới nhanh
function refreshPriceTable() {
    const sanId = document.getElementById('gia-san-select').value;
    if(sanId) loadPriceTable(sanId);
    else showToast("Vui lòng chọn một sân!", "warning");
}


async function deletePriceByGroup(sanId, khungGioId) {
    const confirmed = await showConfirm({
        title: "Xóa bảng giá?",
        message: "Bạn có chắc muốn xóa toàn bộ giá của khung giờ này?",
        confirmText: "Xóa giá",
        confirmClass: "btn-danger"
    });
    if (!confirmed) return;
 
    try {
        const res = await fetch(`${API_URL}/gia-san/san/${sanId}/khung-gio/${khungGioId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await res.json();
 
        if (!res.ok) {
            showToast(result.message || "Không thể xóa giá", "danger");
            return;
        }
 
        showToast(result.message || "Xóa giá thành công", "success");
        loadPriceTable(sanId);
    } catch (error) {
        console.error("Lỗi xóa giá:", error);
        showToast("Lỗi hệ thống khi xóa giá!", "danger");
    }
}
 
async function loadOwnerBookings() {
    const tbody = document.getElementById("table-booking-body");
    if (!tbody) return;
 
    tbody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</td></tr>';
 
    try {
        const res = await fetch(`${API_URL}/bookings/owner/manage`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
 
        if (!res.ok) {
            throw new Error(data.message || "Không thể tải đơn đặt sân");
        }
 
        ownerBookings = Array.isArray(data) ? data : (data.bookings || []);
        ownerBookingSummary = Array.isArray(data) ? buildBookingSummary(ownerBookings) : (data.summary || {});
        updateBookingMetrics();
        if (document.getElementById("booking-tab")?.classList.contains("d-none")) {
            return;
        }
        renderOwnerBookings();
    } catch (error) {
        console.error("Lỗi tải đơn đặt sân:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`;
    }
}
 
async function updateOwnerBookingStatus(datSanId, trangThai) {
    try {
        const res = await fetch(`${API_URL}/bookings/owner/status/${datSanId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ trangThai })
        });
        const result = await res.json();
 
        if (!res.ok) {
            showToast(result.message || "Không thể cập nhật đơn đặt sân", "danger");
            return;
        }
 
        showToast(result.message || "Cập nhật thành công", "success");
        loadOwnerBookings();
    } catch (error) {
        console.error("Lỗi cập nhật đơn:", error);
        showToast("Lỗi hệ thống khi cập nhật đơn!", "danger");
    }
}

function renderOwnerBookings() {
    const tbody = document.getElementById("table-booking-body");
    if (!tbody) return;

    const statusFilter = document.getElementById("booking-status-filter")?.value || "all";
    const paymentFilter = document.getElementById("booking-payment-filter")?.value || "all";
    const search = (document.getElementById("booking-search-input")?.value || "").trim().toLowerCase();
    const bookings = ownerBookings.filter(booking => {
        const matchesStatus = statusFilter === "all" || booking.trangThai === statusFilter;
        const isPaid = booking.trangThaiTT === "da_thanh_toan";
        const matchesPayment = paymentFilter === "all"
            || (paymentFilter === "paid" && isPaid)
            || (paymentFilter === "unpaid" && !isPaid);
        const haystack = [
            booking.datSanId,
            booking.tenKhach,
            booking.emailKhach,
            booking.tenSan,
            booking.ngayDat,
        ].join(" ").toLowerCase();
        return matchesStatus && matchesPayment && (!search || haystack.includes(search));
    });

    if (!bookings.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Không có đơn đặt sân phù hợp.</td></tr>';
        return;
    }

    tbody.innerHTML = bookings.map(booking => {
        const canUpdate = booking.trangThai === "cho_xac_nhan";
        const canComplete = booking.trangThai === "da_xac_nhan";
        const amount = Number(booking.tongTien || 0).toLocaleString("vi-VN");
        const depositAmount = Number(booking.soTien || 0);
        const paymentStatus = getOwnerPaymentStatus(booking);
        const autoConfirmed = booking.trangThai === "da_xac_nhan" && booking.trangThaiTT === "da_thanh_toan" && booking.phuongThuc === "vnpay";
        return `
            <tr>
                <td class="fw-bold">#${booking.datSanId}</td>
                <td>
                    <div class="fw-bold">${escapeHtml(booking.tenKhach)}</div>
                    <small class="text-muted">${escapeHtml(booking.emailKhach)}</small>
                </td>
                <td>${escapeHtml(booking.tenSan)}</td>
                <td>${escapeHtml(booking.ngayDat)}</td>
                <td>${escapeHtml(booking.gioBatDau.slice(0, 5))} - ${escapeHtml(booking.gioKetThuc.slice(0, 5))}</td>
                <td class="fw-bold">${amount}đ</td>
                <td>
                    <span class="payment-status-badge ${paymentStatus.className}">${paymentStatus.label}</span>
                    ${depositAmount > 0 ? `<small class="d-block text-muted mt-1">Cọc: ${depositAmount.toLocaleString("vi-VN")}đ</small>` : ""}
                </td>
                <td>
                    <span class="booking-status-badge ${escapeHtml(booking.trangThai)}">${escapeHtml(getBookingStatusText(booking.trangThai))}</span>
                    ${autoConfirmed ? '<small class="d-block text-success mt-1"><i class="fa-solid fa-bolt"></i> Tự xác nhận</small>' : ''}
                </td>
                <td>
                    ${canUpdate ? `
                        <button class="btn btn-sm btn-success me-1" onclick="updateOwnerBookingStatus(${booking.datSanId}, 'da_xac_nhan')">Xác nhận</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="updateOwnerBookingStatus(${booking.datSanId}, 'da_huy')">Từ chối</button>
                    ` : ''}
                    ${canComplete ? `<button class="btn btn-sm btn-outline-primary" onclick="updateOwnerBookingStatus(${booking.datSanId}, 'hoan_thanh')">Hoàn thành</button>` : ''}
                    ${!canUpdate && !canComplete ? '<span class="text-muted small">Đã xử lý</span>' : ''}
                </td>
            </tr>
        `;
    }).join('');
}
 
function getBookingStatusText(status) {
    const labels = {
        cho_xac_nhan: "Chờ xác nhận",
        da_xac_nhan: "Đã xác nhận",
        hoan_thanh: "Hoàn thành",
        da_huy: "Đã hủy"
    };
    return labels[status] || status;
}

function getOwnerPaymentStatus(booking) {
    if (booking.trangThaiTT === "da_thanh_toan") {
        return { label: booking.phuongThuc === "vnpay" ? "Đã cọc VNPay" : "Đã thanh toán", className: "paid" };
    }
    if (booking.trangThaiTT === "cho_thanh_toan") {
        return { label: "Đang chờ cọc", className: "pending" };
    }
    return { label: "Chưa thanh toán", className: "unpaid" };
}



let map;
let marker;

function initMap() {
    // Đổi 'map' thành 'map-selection'
    map = L.map('map-selection').setView([10.762622, 106.660172], 13);

    // 2. Thêm lớp hình ảnh bản đồ (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 3. Sự kiện Click lên bản đồ để lấy tọa độ
    map.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);

        // Hiển thị tọa độ vào 2 ô input của bạn
        document.getElementById('viDo').value = lat;
        document.getElementById('kinhDo').value = lng;

        // Di chuyển hoặc tạo mới Marker (dấu đỏ)
        if (marker) {
            marker.setLatLng(e.latlng);
        } else {
            marker = L.marker(e.latlng).addTo(map);
        }
    });
}

function setMapPosition(lat, lng, zoom = 16) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !map) return;

    const newPos = [lat, lng];
    map.setView(newPos, zoom);
    if (marker) {
        marker.setLatLng(newPos);
    } else {
        marker = L.marker(newPos).addTo(map);
    }
}

function centerMapFromExistingCoordinates() {
    const lat = Number(document.getElementById('viDo').value);
    const lng = Number(document.getElementById('kinhDo').value);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        setMapPosition(lat, lng, 16);
    }
}

// Gọi hàm khởi tạo

document.getElementById('modalThemSan').addEventListener('shown.bs.modal', function () {
    if (!map) {
        initMap(); // Khởi tạo lần đầu
    } else {
        map.invalidateSize(); // Cập nhật lại kích thước nếu đã có map
    }
    centerMapFromExistingCoordinates();
});

document.getElementById('hinhAnhFile')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) {
        updateImagePreview(currentEditImage);
        return;
    }

    if (!isAllowedImageFile(file)) {
        this.value = "";
        showToast("Chỉ hỗ trợ ảnh JPG, JPEG, JFIF, PNG, WebP hoặc GIF.", "warning");
        updateImagePreview(currentEditImage);
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        this.value = "";
        showToast("Ảnh sân không được vượt quá 5MB.", "warning");
        updateImagePreview(currentEditImage);
        return;
    }

    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
    }
    previewObjectUrl = URL.createObjectURL(file);
    updateImagePreview(previewObjectUrl);
});


function isAllowedImageFile(file) {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/gif"];
    const allowedExtensions = [".jpg", ".jpeg", ".jfif", ".pjpeg", ".pjp", ".png", ".webp", ".gif"];
    const dotIndex = file.name.lastIndexOf(".");
    const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
    return allowedTypes.includes(file.type) || allowedExtensions.includes(ext);
}

// Hàm tìm tọa độ từ địa chỉ văn bản

function scheduleMapAddressUpdate() {
    if (isPrefillingAddress) return;

    clearTimeout(addressSearchTimer);
    addressSearchTimer = setTimeout(updateMapFromAddress, 700);
}

async function updateMapFromAddress() {
    const selectTinh = document.getElementById('tinhThanh');
    const selectQuan = document.getElementById('quanHuyen');
    const selectPhuong = document.getElementById('phuongXa');
    const inputDiaChi = document.getElementById('diaChiChiTiet');

    const tinh = selectTinh.selectedOptions[0]?.getAttribute('data-name') || "";
    const quan = selectQuan.selectedOptions[0]?.getAttribute('data-name') || "";
    const phuong = selectPhuong.selectedOptions[0]?.getAttribute('data-name') || "";
    const duong = inputDiaChi.value.trim();

    // Chỉ tìm kiếm khi đã chọn ít nhất Tỉnh và Quận
    if (!tinh || !quan) return;

    const fullAddress = [duong, phuong, quan, tinh, "Vietnam"].filter(Boolean).join(", ");
    const statusText = document.getElementById("mapAddressStatus");
    if (statusText) {
        statusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Đang tìm vị trí theo địa chỉ...';
    }

    if (addressSearchController) {
        addressSearchController.abort();
    }
    addressSearchController = new AbortController();

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(fullAddress)}`,
            { signal: addressSearchController.signal }
        );
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            document.getElementById('viDo').value = lat.toFixed(6);
            document.getElementById('kinhDo').value = lon.toFixed(6);

            setMapPosition(lat, lon, 16);
            if (statusText) {
                statusText.innerHTML = `<i class="fa-solid fa-location-crosshairs me-1"></i>Đã định vị: ${escapeHtml(data[0].display_name || fullAddress)}`;
            }
            return;
        }

        if (statusText) {
            statusText.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i>Không tìm thấy tọa độ, bạn có thể click trực tiếp trên bản đồ.';
        }
    } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Lỗi tìm địa chỉ:", error);
        if (statusText) {
            statusText.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i>Không thể tự định vị địa chỉ, vui lòng thử lại hoặc click trên bản đồ.';
        }
    }
}


// Bắt buộc đẩy phạm vi toàn cục ra cho HTML gọi được
window.editSan = editSan;
window.deleteSan = deleteSan;
window.openAddMode = openAddMode;
window.switchTab = switchTab;
window.toggleStatus = toggleStatus; // Gắn hàm chuyển trạng thái vào window
// Thêm dòng này vào cuối file dashboard.js

window.applyStatusToAll = applyStatusToAll;
window.deletePriceByGroup = deletePriceByGroup;
window.loadOwnerBookings = loadOwnerBookings;
window.renderOwnerBookings = renderOwnerBookings;
window.updateOwnerBookingStatus = updateOwnerBookingStatus;
 
function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getImageUrl(value) {
    const imagePath = String(value || "").trim();
    if (!imagePath) return "";
    if (/^blob:/i.test(imagePath)) return imagePath;
    if (imagePath.startsWith("/uploads/courts/")) return imagePath;
    if (imagePath.startsWith("uploads/courts/")) return `/${imagePath}`;
    return "";
}

function updateImagePreview(src) {
    const preview = document.getElementById("imagePreview");
    if (!preview) return;

    if (previewObjectUrl && src !== previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = "";
    }

    const imageUrl = getImageUrl(src);
    if (imageUrl) {
        preview.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Ảnh sân">`;
    } else {
        preview.innerHTML = '<i class="fa-regular fa-image"></i><span>Chọn ảnh từ máy</span>';
    }
}

function updateCourtMetrics() {
    document.getElementById("metric-total-courts").innerText = ownerCourts.length;
    document.getElementById("metric-active-courts").innerText = ownerCourts.filter(court => court.tinhTrang === "HoatDong").length;
}

function updateBookingMetrics() {
    const summary = {
        ...buildBookingSummary(ownerBookings),
        ...ownerBookingSummary,
    };
    const autoConfirmed = ownerBookings.filter(booking => (
        booking.trangThai === "da_xac_nhan"
        && booking.trangThaiTT === "da_thanh_toan"
        && booking.phuongThuc === "vnpay"
    )).length;

    document.getElementById("metric-pending-bookings").innerText = autoConfirmed;
    document.getElementById("metric-revenue-today").innerText = formatMoney(summary.revenueToday);
    document.getElementById("metric-bookings-today").innerText = summary.todayBookings || 0;
    document.getElementById("metric-manual-pending").innerText = summary.pendingBookings || 0;
    document.getElementById("metric-online-deposit").innerText = formatMoney(summary.onlineDepositRevenue);
    document.getElementById("metric-total-revenue").innerText = formatMoney(summary.totalRevenue);
}

function buildBookingSummary(bookings) {
    const today = new Date().toISOString().split("T")[0];
    return bookings.reduce((summary, booking) => {
        const isCancelled = booking.trangThai === "da_huy";
        const isPaid = booking.trangThaiTT === "da_thanh_toan";
        summary.pendingBookings += booking.trangThai === "cho_xac_nhan" ? 1 : 0;
        summary.todayBookings += booking.ngayDat === today ? 1 : 0;
        summary.revenueToday += !isCancelled && booking.ngayDat === today ? Number(booking.tongTien || 0) : 0;
        summary.totalRevenue += isCancelled ? 0 : Number(booking.tongTien || 0);
        summary.onlineDepositRevenue += isPaid && booking.phuongThuc === "vnpay" ? Number(booking.soTien || 0) : 0;
        return summary;
    }, {
        pendingBookings: 0,
        todayBookings: 0,
        revenueToday: 0,
        totalRevenue: 0,
        onlineDepositRevenue: 0,
    });
}

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function setFormSubmitting(isSubmitting) {
    const submitBtn = document.querySelector('#form-them-san button[type="submit"]');
    if (!submitBtn) return;

    if (!submitBtn.dataset.defaultHtml) {
        submitBtn.dataset.defaultHtml = submitBtn.innerHTML;
    }

    submitBtn.disabled = isSubmitting;
    submitBtn.innerHTML = isSubmitting
        ? '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang lưu...'
        : submitBtn.dataset.defaultHtml;
}

function ensureToastContainer() {
    let container = document.getElementById("ownerToastContainer");
    if (container) return container;

    container = document.createElement("div");
    container.id = "ownerToastContainer";
    container.className = "toast-container position-fixed top-0 end-0 p-3";
    container.style.zIndex = "1080";
    document.body.appendChild(container);
    return container;
}

function showToast(message, type = "success") {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    const iconMap = {
        success: "fa-circle-check",
        danger: "fa-circle-exclamation",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info"
    };
    const titleMap = {
        success: "Thành công",
        danger: "Có lỗi",
        warning: "Cần chú ý",
        info: "Thông báo"
    };

    toast.className = "toast owner-toast border-0 shadow";
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");
    toast.innerHTML = `
        <div class="toast-header owner-toast-${type}">
            <i class="fa-solid ${iconMap[type] || iconMap.info} me-2"></i>
            <strong class="me-auto">${titleMap[type] || titleMap.info}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Đóng"></button>
        </div>
        <div class="toast-body"></div>
    `;
    toast.querySelector(".toast-body").textContent = message;
    container.appendChild(toast);

    const instance = new bootstrap.Toast(toast, { delay: 3000 });
    toast.addEventListener("hidden.bs.toast", () => toast.remove());
    instance.show();
}

function showConfirm({ title, message, confirmText = "Xác nhận", confirmClass = "btn-primary" }) {
    return new Promise((resolve) => {
        let modalElement = document.getElementById("ownerConfirmModal");
        if (!modalElement) {
            modalElement = document.createElement("div");
            modalElement.id = "ownerConfirmModal";
            modalElement.className = "modal fade";
            modalElement.tabIndex = -1;
            modalElement.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header">
                            <h5 class="modal-title"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-0"></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Hủy</button>
                            <button type="button" class="btn owner-confirm-btn"></button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalElement);
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        const confirmButton = modalElement.querySelector(".owner-confirm-btn");
        modalElement.querySelector(".modal-title").textContent = title;
        modalElement.querySelector(".modal-body p").textContent = message;
        confirmButton.textContent = confirmText;
        confirmButton.className = `btn owner-confirm-btn ${confirmClass}`;

        const cleanup = () => {
            confirmButton.removeEventListener("click", onConfirm);
            modalElement.removeEventListener("hidden.bs.modal", onCancel);
        };
        const onConfirm = () => {
            cleanup();
            modal.hide();
            resolve(true);
        };
        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        confirmButton.addEventListener("click", onConfirm);
        modalElement.addEventListener("hidden.bs.modal", onCancel, { once: true });
        modal.show();
    });
}