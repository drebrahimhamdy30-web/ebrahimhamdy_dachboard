const CONFIG = {
    SEND_ORDER_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/taskmanagement',
    FETCH_ORDERS_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/get_order',
    // أضف هذا الرابط الخاص بالـ Webhook الذي قمت بإنشائه في n8n لعملية تسجيل الدخول
    LOGIN_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/login', 
};

// الدالة الجديدة للتعامل مع تسجيل الدخول من n8n
async function login(username, password) {
    try {
        const response = await fetch(CONFIG.LOGIN_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: username, password: password })
        });
        
        const data = await response.json();
        
        if (data.status === "success") {
            // حفظ البيانات التي أرسلها n8n في ذاكرة المتصفح
            localStorage.setItem('activeUser', data.user);
            localStorage.setItem('userRole', data.role);   // admin أو employee
            localStorage.setItem('userBranch', data.branch);
            return { success: true };
        } else {
            return { success: false, message: data.message || "بيانات الدخول غير صحيحة" };
        }
    } catch (error) {
        console.error("خطأ في الاتصال:", error);
        return { success: false, message: "تعذر الاتصال بالسيرفر" };
    }
}

// (بقية الدوال تبقى كما هي...)
async function postData(data) { /* ... */ }
async function fetchData() { /* ... */ }
function checkAuth() { 
    const user = localStorage.getItem('activeUser'); 
    if (!user) { window.location.href = 'index.html'; return null; }
    return user;
}
function logout() { localStorage.clear(); window.location.href = 'index.html'; }
