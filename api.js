// 1. تعريف الروابط الأساسية
const FETCH_URL = "https://agent.ebrahimhamdy.com/webhook/get_order";
const POST_URL = "https://agent.ebrahimhamdy.com/webhook/get_order";

// 2. دالة جلب البيانات الموحدة (للجلب فقط GET)
async function fetchFromN8N(category) {
    try {
        const response = await fetch(`${FETCH_URL}?type=${category}`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        // ضمان عودة البيانات كـ Array
        return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        return [];
    }
}

// 3. الدوال التي تستخدمها الصفحات لجلب البيانات
async function fetchOrders() { return await fetchFromN8N('orders'); }
async function fetchNotifications() { return await fetchFromN8N('notifications'); }
// أضفت لك هذه الدالة لأن صفحة المشتريات قد تناديها باسمها القديم أحياناً
async function fetchData() { return await fetchFromN8N('orders'); }

// 4. دالة التحديث والإرسال (POST) - مهمة جداً لعمل "حفظ"
async function updateData(data) {
    try {
        const response = await fetch(POST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error("Error updating data:", error);
        return false;
    }
}

// 5. دالة إرسال الإشعارات
async function postNotification(data) {
    return await updateData(data); // تستخدم نفس دالة الـ POST
}

// 6. نظام التأكد من الهوية (تسجيل الدخول)
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// دالة تسجيل الدخول (التي تستخدمها صفحة index.html)
function login(username) {
    localStorage.setItem('activeUser', username);
    window.location.href = 'main.html';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
