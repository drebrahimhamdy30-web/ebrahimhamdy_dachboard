// الرابط الموحد لكل عمليات العرض
const FETCH_URL = "https://agent.ebrahimhamdy.com/webhook/get_order";

// 1. دالة جلب المشتريات والتحويلات (تأكد أن الشرط في n8n هو orders)
async function fetchOrders() {
    try {
        const response = await fetch(`${FETCH_URL}?type=orders`); // أضفنا type=orders
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
        return [];
    }
}

// 2. دالة جلب الإشعارات (تأكد أن الشرط في n8n هو notifications)
async function fetchNotifications() {
    try {
        const response = await fetch(`${FETCH_URL}?type=notifications`); // أضفنا type=notifications
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
        return [];
    }
}

// دالة إرسال الإشعارات (للجدول الجديد)
async function postNotification(data) {
    try {
        const response = await fetch(NOTIF_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error("Error posting notification:", error);
        return false;
    }
}

// دالة جلب الإشعارات (للعرض في صفحة الإشعارات)
async function fetchNotifications() {
    try {
        const response = await fetch(NOTIF_API_URL);
        const data = await response.json();
        // تأكد أن n8n يرسل البيانات في مصفوفة
        return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}

// دالة التحقق من تسجيل الدخول
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
