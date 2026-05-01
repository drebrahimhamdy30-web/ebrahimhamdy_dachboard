/**
 * api.js - نسخة بيئة التجربة (Branch: updates)
 * مصمم لمحاكاة البيانات والوظائف دون التأثير على السيرفر الحقيقي
 */

// 1. تعريف الروابط الأساسية (موقوفة مؤقتاً في وضع التجربة)
const FETCH_URL = "https://agent.ebrahimhamdy.com/webhook/get_order";
const POST_URL = "https://agent.ebrahimhamdy.com/webhook/taskmanagement";
const LOGIN_URL = "https://agent.ebrahimhamdy.com/webhook/login"; 

// 2. دالة جلب البيانات المحاكية (Mock Engine)
async function fetchFromN8N(category) {
    console.warn(`⚠️ وضع التجربة نشط: جلب بيانات وهمية لـ [${category}]`);
    
    // محاكاة تأخير الشبكة لإضفاء واقعية
    await new Promise(resolve => setTimeout(resolve, 600));

    // القاموس الذكي للبيانات الوهمية بناءً على نوع الطلب
    const mockDatabase = {
        'orders': [
            { id: 101, createdAt: new Date(), item_name: "Panadol Advance", user: "Sidi Bishr", cust_name: "أحمد علي", cust_code: "5050", cust_state: "متابعة" },
            { id: 102, createdAt: new Date(), item_name: "Catafast Sachets", user: "San Stefano", cust_name: "سارة محمود", cust_code: "6060", cust_state: "متوفر وتم ابلاغ العميل" },
            { id: 103, createdAt: new Date(), item_name: "Augmentin 1gm", user: "المعمورة", cust_name: "محمد حسن", cust_code: "7070", cust_state: "متابعة" }
        ],
        'purchases': [
            { id: 201, createdAt: "2026-05-01", item_name: "كونجيستال أقراص", user: "المعمورة", qty: "10", company: "أوتسوكا", state: "تم الاستلام" },
            { id: 202, createdAt: "2026-05-01", item_name: "باندول إكسترا", user: "سيدي بشر", qty: "5", company: "جلاكسو", state: "قيد التوريد" }
        ],
        'transfers': [
            { id: 301, date: "2026-05-01", item: "Controloc 40mg", from: "المعمورة", to: "سيدي بشر", status: "تم التحويل" }
        ]
    };

    // إرجاع البيانات بناءً على التصنيف المطلوب، أو مصفوفة فارغة إذا لم يوجد
    return mockDatabase[category] || mockDatabase['orders'];
}

// الدوال الفرعية لجلب البيانات
async function fetchOrders() { return await fetchFromN8N('orders'); }
async function fetchPurchases() { return await fetchFromN8N('purchases'); }
async function fetchTransfers() { return await fetchFromN8N('transfers'); }

// 3. دالة تسجيل الدخول التجريبية
async function login(username, password) {
    console.log("🔐 محاولة دخول تجريبية باسم:", username);
    await new Promise(resolve => setTimeout(resolve, 800));

    if (username === "admin" && password === "123") {
        return { success: true, user: "Admin", branch: "عام" };
    }
    return { success: false, message: "بيانات التجربة: admin و 123" };
}

// 4. دالة تحديث البيانات (محاكاة الأكشن)
async function updateData(data) {
    console.log("🚀 [بيئة تجربة] تم استلام طلب تحديث:", data);
    
    // محاكاة نجاح العملية دون إرسالها للـ Webhook
    await new Promise(resolve => setTimeout(resolve, 400));
    return true; 
}

// 5. نظام التحقق من الصلاحيات (Session Management)
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    // إذا كنت في صفحة غير تسجيل الدخول ولا يوجد مستخدم، حول لصفحة الدخول
    if (!user && !window.location.href.includes('index.html')) {
        window.location.replace('index.html');
        return null;
    }
    return user;
}

function logout() {
    console.log("👋 تسجيل خروج...");
    localStorage.clear();
    window.location.replace('index.html');
}
