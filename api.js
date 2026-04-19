const CONFIG = {
    // الرابط الذي يستقبل الإضافة الجديدة والتحديث
    SEND_ORDER_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/taskmanagement',
    // الرابط الذي يجلب البيانات للعرض
    FETCH_ORDERS_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/get_order',
};

async function postData(data) {
    try {
        const response = await fetch(CONFIG.SEND_ORDER_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("خطأ في الإرسال:", error);
        throw error;
    }
}

async function fetchData() {
    try {
        const response = await fetch(CONFIG.FETCH_ORDERS_WEBHOOK);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || [data]);
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        throw error;
    }
}

function formatDate(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function checkAuth() {
    const user = localStorage.getItem('activeUser');
    if (!user) { window.location.href = 'index.html'; return null; }
    return user;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
