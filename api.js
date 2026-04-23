// 1. تعريف الروابط (تأكد من الروابط الصحيحة)
const FETCH_URL = "https://agent.ebrahimhamdy.com/webhook/get_order"; // للعرض
const POST_MAIN_URL = "https://agent.ebrahimhamdy.com/webhook/get_order"; // للادخال (لو نفس الرابط)

// 2. دالة جلب البيانات (orders أو notifications)
async function fetchFromN8N(category) {
    try {
        const response = await fetch(`${FETCH_URL}?type=${category}`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        return [];
    }
}

// 3. الدوال اللي الصفحات بتستخدمها (دوال مبسطة)
async function fetchOrders() {
    return await fetchFromN8N('orders');
}

async function fetchNotifications() {
    return await fetchFromN8N('notifications');
}

// 4. دالة إرسال الإشعارات (POST)
async function postNotification(data) {
    try {
        const response = await fetch(FETCH_URL, { // تأكد من رابط الـ POST هنا
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

// 5. دالة التحقق من تسجيل الدخول والخروج
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
