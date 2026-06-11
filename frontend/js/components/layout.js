function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
}

function getUserInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'KH';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function closeProfileDropdown() {
    const menu = document.getElementById('profileMenu');
    const trigger = document.getElementById('profileTrigger');
    const dropdown = document.getElementById('profileDropdown');
    if (!menu || !trigger || !dropdown) return;
    menu.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'true');
}

function toggleProfileDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('profileMenu');
    const trigger = document.getElementById('profileTrigger');
    const dropdown = document.getElementById('profileDropdown');
    if (!menu || !trigger || !dropdown) return;

    const isOpen = menu.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    dropdown.setAttribute('aria-hidden', String(!isOpen));
}

function logoutCustomer() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/frontend/login.html';
}

function initCustomerNavbar({ activePage = 'home' } = {}) {
    const user = getStoredUser();
    const isLoggedIn = Boolean(user.ten && localStorage.getItem('token'));
    const profileMenu = document.getElementById('profileMenu');
    const guestActions = document.getElementById('guestActions');

    if (profileMenu) {
        profileMenu.style.display = isLoggedIn ? 'block' : 'none';
    }
    if (guestActions) {
        guestActions.style.display = isLoggedIn ? 'none' : 'flex';
    }

    if (isLoggedIn) {
        const profileName = document.getElementById('profileName');
        const profileAvatar = document.getElementById('profileAvatar');
        const dropdownName = document.getElementById('dropdownUserName');
        const dropdownEmail = document.getElementById('dropdownUserEmail');

        if (profileName) profileName.textContent = user.ten;
        const dropdownAvatar = document.getElementById('dropdownAvatar');
        const initials = getUserInitials(user.ten);

        if (profileAvatar) profileAvatar.textContent = initials;
        if (dropdownAvatar) dropdownAvatar.textContent = initials;
        if (dropdownName) dropdownName.textContent = user.ten;
        if (dropdownEmail) dropdownEmail.textContent = user.email || 'Khách hàng SportHub';

        const trigger = document.getElementById('profileTrigger');
        if (trigger && !trigger.dataset.bound) {
            trigger.addEventListener('click', toggleProfileDropdown);
            trigger.dataset.bound = '1';
        }
    }

    document.querySelectorAll('.nav-links a[data-nav]').forEach((link) => {
        link.classList.toggle('active', link.dataset.nav === activePage);
    });

    if (!document.body.dataset.profileBound) {
        document.addEventListener('click', (event) => {
            const menu = document.getElementById('profileMenu');
            if (menu && !menu.contains(event.target)) {
                closeProfileDropdown();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeProfileDropdown();
        });
        document.body.dataset.profileBound = '1';
    }
}

function renderSiteFooter() {
    const footer = document.getElementById('siteFooter');
    if (!footer) return;

    footer.innerHTML = `
        <div class="footer-inner">
            <div class="footer-brand">
                <div class="footer-logo">SPORT<span>HUB</span></div>
                <p>Nền tảng đặt sân thể thao trực tuyến — tìm sân, chọn giờ và thanh toán nhanh chóng.</p>
                <div class="footer-social">
                    <a href="https://www.facebook.com/ngo.van.nam.375363" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
                    <a href="https://www.instagram.com/vnaw.t/" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
                    <a href="#" aria-label="Zalo"><i class="fa-solid fa-comment-dots"></i></a>
                </div>
            </div>
            <div class="footer-col">
                <h4>Liên kết</h4>
                <a href="/frontend/home.html">Trang chủ</a>
                <a href="/frontend/history.html">Lịch sử đặt sân</a>
                <a href="/frontend/login.html">Đăng nhập</a>
                <a href="/frontend/register.html">Đăng ký</a>
            </div>
            <div class="footer-col">
                <h4>Liên hệ</h4>
                <a href="mailto:sporthub204@gmail.vn"><i class="fa-solid fa-envelope"></i> support@sporthub.vn</a>
                <a href="tel:0988499723"><i class="fa-solid fa-phone"></i> 1900 1234</a>
                <p><i class="fa-solid fa-location-dot"></i> 32 đường Phố Viên, phường Đức Thắng, Hà Nội</p>
            </div>
            <div class="footer-col">
                <h4>Hỗ trợ</h4>
                <p>Thứ 2 – Chủ nhật: 7:00 – 22:00</p>
                <p>Phản hồi trong vòng 24 giờ làm việc.</p>
            </div>
        </div>
        <div class="footer-bottom">
            <span>&copy; ${new Date().getFullYear()} SportHub. Bảo lưu mọi quyền.</span>
        </div>
    `;
}

function initCustomerLayout(options = {}) {
    initCustomerNavbar(options);
    renderSiteFooter();
}
