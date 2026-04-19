const CONFIG = {
    SEND_ORDER_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/taskmanagement',
    FETCH_ORDERS_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/get_order', // رابط افتراضي للجلب
};

// وظيفة عامة لإرسال البيانات
async function postData(data) {
    try {
        const response = await fetch(CONFIG.SEND_ORDER_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error("خطأ في الإرسال:", error);
        throw error;
    }
}

// وظيفة عامة لجلب البيانات
async function fetchData() {
    try {
        const response = await fetch(CONFIG.FETCH_ORDERS_WEBHOOK);
        return await response.json();
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        throw error;
    }
}

// نظام الحماية المشترك
function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user) {
        window.location.href = 'index.html';
    }
    return user;
}
