const CONFIG = {
    SEND_ORDER_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/taskmanagement',
    FETCH_ORDERS_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/get_order',
    LOGIN_WEBHOOK: 'https://agent.ebrahimhamdy.com/webhook/login', 
};

// دالة تسجيل الدخول
async function login(username, password) {
    try {
        const response = await fetch(CONFIG.LOGIN_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: username, password: password })
        });
        
        const data = await response.json();
        
        if (data.status === "success") {
            localStorage.setItem('activeUser', data.user);
            localStorage.setItem('userRole', data.role); 
            localStorage.setItem('userBranch', data.branch);
            return { success: true };
        } else {
            return { success: false, message: data.message || "بيانات الدخول غير صحيحة" };
        }
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "تعذر الاتصال بالسيرفر" };
    }
}

// دالة جلب البيانات من n8n
async function fetchData() {
    try {
        const response = await fetch(CONFIG.FETCH_ORDERS_WEBHOOK, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        return null;
    }
}

// --- الدالة المضافة لحل المشكلة ---
async function updateData(data) {
    try {
        const response = await fetch(CONFIG.SEND_ORDER_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error("Update Error:", error);
        return false;
    }
}

// دالة الإرسال القديمة (للحفاظ على توافق الصفحات الأخرى)
async function postData(data) {
    return await updateData(data);
}

// حماية الصفحة وتأكيد الدخول
function checkAuth() { 
    const user = localStorage.getItem('activeUser'); 
    if (!user) { 
        window.location.href = 'index.html'; 
        return null; 
    }
    return user;
}

// تسجيل الخروج
function logout() { 
    localStorage.clear(); 
    window.location.href = 'index.html'; 
}
