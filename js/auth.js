// ============================================
// AUTHENTICATION SYSTEM
// ============================================

// --- កំណត់ Base Path សម្រាប់ GitHub Pages ---
// ឧបមាថា URL មូលដ្ឋានរបស់អ្នកគឺ https://pheaklong.github.io/builcard/
// យើងនឹងប្រើអថេរនេះសម្រាប់ប្តូរទីតាំងទាំងអស់ទៅកាន់ login.html
const BASE_PATH = '/builcard/'; // ត្រូវតែបញ្ចប់ដោយ "/"
const LOGIN_URL = `${window.location.origin}${BASE_PATH}login.html`;

// Users database
const USERS = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'user', password: 'user123', role: 'user' },
    { username: 'keovriev', password: 'school2024', role: 'admin' }
];

// Session timeout (8 hours)
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;

// Check if user is logged in
function isLoggedIn() {
    const session = localStorage.getItem('userSession');
    if (!session) return false;
    
    try {
        const sessionData = JSON.parse(session);
        const loginTime = sessionData.loginTime;
        const currentTime = Date.now();
        
        if (currentTime - loginTime > SESSION_TIMEOUT) {
            logout();
            return false;
        }
        return true;
    } catch(e) {
        return false;
    }
}

// Get current user
function getCurrentUser() {
    const session = localStorage.getItem('userSession');
    if (!session) return null;
    try {
        return JSON.parse(session).user;
    } catch(e) {
        return null;
    }
}

// Login function
function login(username, password) {
    const user = USERS.find(u => u.username === username && u.password === password);
    
    if (user) {
        const session = {
            user: { username: user.username, role: user.role },
            loginTime: Date.now()
        };
        localStorage.setItem('userSession', JSON.stringify(session));
        return true;
    }
    return false;
}

// --- កែប្រែមុខងារ logout ---
function logout() {
    localStorage.removeItem('userSession');
    localStorage.removeItem('redirectAfterLogin');
    // ប្តូរទីតាំងទៅកាន់ login.html ដោយប្រើ LOGIN_URL ដែលបានកំណត់
    window.location.href = LOGIN_URL;
}

// Check if current page is public
function isPublicPage() {
    const publicPages = ['digital-card.html', 'login.html'];
    const currentPage = window.location.pathname.split('/').pop();
    return publicPages.includes(currentPage);
}

// --- កែប្រែមុខងារ protectPage ---
function protectPage() {
    if (!isPublicPage() && !isLoggedIn()) {
        // រក្សាទុក URL ដើមដែលចង់ចូល ដើម្បីប្តូរទីតាំងត្រឡប់ក្រោយពេលកត់ឈ្មោះចូល
        localStorage.setItem('redirectAfterLogin', window.location.href);
        // ប្តូរទីតាំងទៅកាន់ login.html
        window.location.href = LOGIN_URL;
        return false;
    }
    return true;
}

// Make functions globally available
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.login = login;
window.logout = logout;
window.protectPage = protectPage;

console.log('✅ Auth system loaded');
console.log('Login page URL:', LOGIN_URL);
