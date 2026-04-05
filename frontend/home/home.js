// Dữ liệu danh sách sân
const courts = [
    { id: 1, name: "Sân Bóng DHM", type: "football", location: "Phố Viên", price: 300000, img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500" },
    { id: 2, name: "Cầu Lông T12", type: "badminton", location: "Văn hội", price: 80000, img: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500" },
    { id: 3, name: "Tennis Lan Anh", type: "tennis", location: "Cổ Nhuế", price: 250000, img: "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=500" },
    { id: 4, name: "Sân bóng khu đô thị mới", type: "football", location: "Tân phong", price: 450000, img: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=500" },
];

// Hàm hiển thị sân
function displayCourts(data) {
    const grid = document.getElementById('courtGrid');
    grid.innerHTML = data.map(court => `
        <div class="court-card">
            <img src="${court.img}" class="court-img">
            <div class="court-info">
                <span class="court-tag">${court.type.toUpperCase()}</span>
                <h4>${court.name}</h4>
                <p><i class="fa-solid fa-location-dot"></i> ${court.location}</p>
                <span class="price">${court.price.toLocaleString()} VNĐ/giờ</span>
                <button class="btn-book">Đặt ngay</button>
            </div>
        </div>
    `).join('');
}

// Hàm lọc chính
function filterCourts() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;

    const filtered = courts.filter(court => {
        const matchesSearch = court.name.toLowerCase().includes(searchText) || court.location.toLowerCase().includes(searchText);
        const matchesType = typeFilter === 'all' || court.type === typeFilter;
        return matchesSearch && matchesType;
    });

    displayCourts(filtered);
}

function updatePriceLabel(val) {
    document.getElementById('priceLabel').innerText = `Dưới ${parseInt(val).toLocaleString()} VNĐ`;
}

// Khởi tạo ban đầu
displayCourts(courts);