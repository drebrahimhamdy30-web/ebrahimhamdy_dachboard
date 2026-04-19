/**
 * نظام الربط البرمجي الموحد لشبكة صيدليات د. إبراهيم
 * مصمم ليكون قابلاً للتوسع والربط مع n8n وجوجل شيت
 */

const CONFIG = {
    // رابط إرسال الطلبات (POST)
    SEND_ORDER_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/taskmanagement',
    // رابط جلب البيانات (GET) - تأكد أنه رابط الـ Production
    FETCH_ORDERS_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/get_order',
};

/**
 * وظيفة إرسال البيانات إلى n8n
 * @param {Object} data - بيانات الطلب (user, type, branch, item, qty)
 */
async function postData(data) {
    try {
        console.log("جاري إرسال الطلب إلى n8n...", data);
        const response = await fetch(CONFIG.SEND_ORDER_WEBHOOK, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error(`خطأ في الإرسال: ${response.status}`);
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("فشل في الوصول إلى n8n (إرسال):", error);
        throw error;
    }
}

/**
 * وظيفة جلب البيانات من n8n وعرضها في الجداول
 * مصممة لتتحمل اختلاف تنسيقات البيانات من n8n
 */
async function fetchData() {
    try {
        console.log("جاري طلب البيانات من:", CONFIG.FETCH_ORDERS_WEBHOOK);
        const response = await fetch(CONFIG.FETCH_ORDERS_WEBHOOK);
        
        if (!response.ok) {
            throw new Error(`خطأ في الاتصال بالـ Webhook: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("تم استلام البيانات بنجاح:", data);

        // معالجة البيانات لضمان إرجاع قائمة (Array) دائماً للمتصفح
        if (Array.isArray(data)) {
            return data;
        } else if (data && typeof data === 'object') {
            // إذا كانت البيانات مغلفة داخل JSON Body
            if (Array.isArray(data.data)) return data.data;
            if (Array.isArray(data.items)) return data.items;
            // إذا كان سطر واحد فقط ككائن (Object) نحوله لقائمة
            return [data];
        }
        
        return []; // إرجاع قائمة فارغة إذا لم توجد بيانات
    } catch (error) {
        console.error("خطأ فني في جلب البيانات:", error);
        throw error;
    }
}

/**
 * وظيفة الحماية والتحقق من هوية المستخدم
 */
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user) {
        // إذا لم يكن مسجلاً، يوجهه لصفحة الدخول
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

/**
 * وظيفة تسجيل الخروج
 */
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
