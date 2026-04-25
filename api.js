// 1. تعريف الروابط الأساسية
const FETCH_URL = "https://agent.ebrahimhamdy.com/webhook/get_order";
const POST_URL = "https://agent.ebrahimhamdy.com/webhook/taskmanagement";
const LOGIN_URL = "https://agent.ebrahimhamdy.com/webhook/login"; // أضف رابط اللوجن الخاص بك هنا

// 2. دالة جلب البيانات الموحدة (GET)
async function fetchFromN8N(category) {
    try {
        const response = await fetch(`${FETCH_URL}?type=${category}`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        
        // تعديل لضمان الوصول لمصفوفة البيانات مهما كان شكل الرد من n8n
        if (Array.isArray(data)) return data;
        if (data.data && Array.isArray(data.data)) return data.data;
        if (data[0] && data[0].data) return data[0].data;
        
        return [];
    } catch (error) {
        console.error(`Error fetching ${category}:`, error);
        return [];
    }
}

// 3. الدوال التي تستخدمها الصفحات لجلب البيانات
async function fetchOrders() { return await fetchFromN8N('orders'); }
async function fetchNotifications() { return await fetchFromN8N('notifications'); }
async function fetchData() { return await fetchFromN8N('orders'); }

// 4. دالة التحديث والإرسال (POST)
async function updateData(data) {
    try {
        console.log("📤 Sending POST to n8n:", data);
        
        const response = await fetch(POST_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json', // يفضل استخدام json طالما السيرفر يدعمه
            },
            body: JSON.stringify(data)
        });

        return response.ok; 
    } catch (error) {
        console.error("❌ Network Error:", error);
        return false;
    }
}

// 5. نظام التأكد من الهوية (المعدل)
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if ((!user || isLoggedIn !== 'true') && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// دالة تسجيل الدخول المحدثة لتتوافق مع n8n وصفحة index.html
async function login(username, password) {
    try {
        const response = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: username, pass: password })
        });

        if (!response.ok) return { success: false, message: "تعذر الاتصال بالسيرفر" };

        const result = await response.json();
        // ملاحظة: لا نضع window.location هنا، نتركها لصفحة index.html
        return result; 
        
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "خطأ في الشبكة" };
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// تصدير الدوال لو كانت تستخدم في موديلات أخرى (اختياري)
// window.fetchOrders = fetchOrders; ...
