// 1. تعريف الروابط (نتركها كما هي للرجوع إليها لاحقاً)
const FETCH_URL = "https://agent.ebrahimhamdy.com/webhook/get_order";
const POST_URL = "https://agent.ebrahimhamdy.com/webhook/taskmanagement";
const LOGIN_URL = "https://agent.ebrahimhamdy.com/webhook/login"; 

// 2. دالة جلب البيانات (معدلة لترجع بيانات وهمية للتجربة)
async function fetchFromN8N(category) {
    console.warn(`⚠️ وضع التجربة نشط: جلب بيانات وهمية لـ ${category}`);
    
    // بيانات وهمية لمحاكاة قاعدة البيانات الأصلية
    const mockData = [
        { id: 101, createdAt: new Date(), item_name: "Panadol Advance", user: "Sidi Bishr", cust_name: "أحمد علي", cust_code: "5050", cust_state: "متابعة" },
        { id: 102, createdAt: new Date(), item_name: "Catafast Sachets", user: "San Stefano", cust_name: "سارة محمود", cust_code: "6060", cust_state: "متوفر وتم ابلاغ العميل" },
        { id: 103, createdAt: new Date(), item_name: "Augmentin 1gm", user: "Mamora", cust_name: "محمد حسن", cust_code: "7070", cust_state: "متابعة" },
        { id: 104, createdAt: new Date(), item_name: "Vitamin C 1000mg", user: "Sidi Bishr", cust_name: "إبراهيم حمدي", cust_code: "8080", cust_state: "متابعة" }
    ];

    // محاكاة تأخير الشبكة (نصف ثانية) لجعل التجربة واقعية
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockData;
}

async function fetchOrders() { return await fetchFromN8N('orders'); }

// 3. دالة تسجيل الدخول (وهمية للتجربة ببيانات ثابتة)
async function login(username, password) {
    console.log("محاولة تسجيل دخول تجريبية:", username);
    if (username === "admin" && password === "123") {
        return { success: true, user: "Admin", branch: "عام" };
    }
    return { success: false, message: "بيانات الدخول التجريبية هي admin و 123" };
}

// 4. دالة تحديث البيانات (محاكاة - لا ترسل للسيرفر الحقيقي)
async function updateData(data) {
    console.log("🚀 تم استدعاء تحديث البيانات (محاكاة):", data);
    
    // محاكاة نجاح العملية
    await new Promise(resolve => setTimeout(resolve, 300));
    return true; 
}

// 5. التحقق من الهوية (تبقى كما هي لضمان عمل الصفحات)
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user && !window.location.href.includes('index.html')) {
        window.location.replace('index.html');
        return null;
    }
    return user;
}

function logout() {
    localStorage.clear();
    window.location.replace('index.html');
}
