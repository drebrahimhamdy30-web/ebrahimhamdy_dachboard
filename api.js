/**
 * نظام الربط البرمجي الموحد لشبكة صيدليات د. إبراهيم
 */

const CONFIG = {
    // رابط إرسال الطلبات (تأكد من أنه الرابط الدائم Production)
    SEND_ORDER_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/taskmanagement',
    
    // رابط جلب البيانات (تأكد من مطابقة الكلمة get_order مع إعداد n8n)
    FETCH_ORDERS_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/get_order',
};

/**
 * وظيفة إرسال البيانات (المستخدمة في main.html)
 */
async function postData(data) {
    try {
        const response = await fetch(CONFIG.SEND_ORDER_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('فشل في إرسال البيانات');
        return await response.json();
    } catch (error) {
        console.error("Error posting data:", error);
        throw error;
    }
}

/**
 * وظيفة جلب البيانات (المستخدمة في المشتريات والتحويلات)
 */
async function fetchData() {
    try {
        console.log("جاري طلب البيانات من n8n...");
        const response = await fetch(CONFIG.FETCH_ORDERS_WEBHOOK);
        
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();
        console.log("البيانات المستلمة:", data);

        // n8n قد يرسل البيانات كمصفوفة أو كائن وحيد
        return Array.isArray(data) ? data : [data];
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

/**
 * وظيفة مساعدة لتنسيق الوقت بشكل جمالي
 */
function formatDate(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * نظام الحماية والتحقق من الهوية
 */
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

/**
 * تسجيل الخروج
 */
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
