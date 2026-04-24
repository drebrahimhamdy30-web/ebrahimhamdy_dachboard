// 1. تعريف الروابط الأساسية
const FETCH_URL = "https://agent.ebrahimhamdy.com/webhook/get_order";
const POST_URL = "https://agent.ebrahimhamdy.com/webhook/taskmanagement";

// 2. دالة جلب البيانات الموحدة (GET)
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

// 3. الدوال التي تستخدمها الصفحات لجلب البيانات
async function fetchOrders() { return await fetchFromN8N('orders'); }
async function fetchNotifications() { return await fetchFromN8N('notifications'); }
async function fetchData() { return await fetchFromN8N('orders'); }

// 4. دالة التحديث والإرسال (POST) - النسخة المطورة
async function updateData(data) {
    try {
        console.log("📤 Sending POST to n8n:", data);
        
        const response = await fetch(POST_URL, {
            method: 'POST',
            mode: 'cors', // التأكيد على وضع CORS
            headers: {
                // ملاحظة: أحياناً n8n يفضل عدم وجود headers معقدة إذا كان الـ CORS غير مضبوط بدقة
                'Content-Type': 'text/plain', // تغيير لـ text/plain يقلل قيود CORS في بعض السيرفرات
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            console.error("❌ Server Error:", response.status);
            return false;
        }

        console.log("✅ Data sent successfully");
        return true;
    } catch (error) {
        console.error("❌ Network Error (CORS likely):", error);
        return false;
    }
}

// 5. دوال الإرسال المستخدمة في النظام
async function postNotification(data) { return await updateData(data); }
async function postData(data) { return await updateData(data); }

// 6. نظام التأكد من الهوية
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

function login(username) {
    localStorage.setItem('activeUser', username);
    window.location.href = 'main.html';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
