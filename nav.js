function loadNavbar() {
    const navHTML = `
        <div class="nav-links">
            <a href="main.html">مدخلات</a>
            <a href="purchases.html">مشتريات</a>
            <a href="transfers.html">تحويلات</a>
            <a href="customer_service.html">خدمة العملاء</a>
            <a href="inventory.html">جرد</a>
            <a href="notifications.html">إشعارات</a>
        </div>`;
    document.querySelector('.nav-bar').insertAdjacentHTML('afterbegin', navHTML);
}
