// الرابط الأساسي (للمشتريات، التحويلات، الجرد)
const MAIN_API_URL = "https://agent.ebrahimhamdy.com/webhook/pharmacy-main"; // تأكد من وضع رابطك القديم هنا

// الرابط الجديد (للإشعارات فقط)
const NOTIF_API_URL = "https://agent.ebrahimhamdy.com/webhook/notifications";

// دالة إرسال البيانات (للمشتريات والتحويلات والجرد)
async function postData(data) {
    try {
        const response = await fetch(MAIN_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error("Error posting data:", error);
        return false;
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
