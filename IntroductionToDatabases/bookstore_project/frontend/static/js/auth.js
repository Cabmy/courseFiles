/**
 * 用户认证工具模块
 * 提供登录状态检查、令牌管理、用户信息获取等共享功能
 */

// 检查用户是否已登录
function checkAuthenticated() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // 确保令牌存在且用户ID有效
    return !!token && !!user.user_id;
}

// 获取当前登录用户信息
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

// 获取认证请求头
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token || token === "undefined" || token === "null") {
        localStorage.removeItem('token');
        console.error('令牌无效');
        return { 'Content-Type': 'application/json' };
    }

    // 确保令牌格式正确，移除可能的空格
    const cleanToken = token.trim();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
    };
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// 检查是否有管理员权限
function isAdmin() {
    const user = getCurrentUser();
    return user.role === '超级管理员' || user.role === '普通管理员';
}

// 检查是否有超级管理员权限
function isSuperAdmin() {
    const user = getCurrentUser();
    return user.role === '超级管理员';
}

// 更新用户信息
function updateUserInfo(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
}

// 查看登录处理函数
function login(username, password) {
    // 修改登录函数部分
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
        .then(response => {
            console.log("登录响应状态:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("登录API响应:", JSON.stringify(data, null, 2));

            // 验证令牌是否存在且有效
            if (data.status === 'success' && data.data && typeof data.data.token === 'string' && data.data.token.trim() !== '') {
                const tokenToStore = data.data.token.trim(); // 去除可能的前后空格
                console.log("存储令牌:", tokenToStore);

                // 存储令牌和用户数据
                localStorage.setItem('token', tokenToStore);

                if (data.data.user) {
                    localStorage.setItem('user', JSON.stringify(data.data.user));
                } else {
                    console.warn("登录响应缺少用户数据");
                }

                // 跳转到仪表盘
                window.location.href = '/dashboard';
            } else {
                // 处理登录失败
                console.error("登录失败或令牌无效", data);
            }
        });
}

// 创建一个通用的API请求函数
function apiRequest(url, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('未找到身份验证令牌');
        window.location.href = '/login';
        return Promise.reject('未授权');
    }

    // 调试信息
    console.log("发送请求，使用令牌:", token);

    // 确保令牌格式正确
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.trim()}`  // 确保令牌格式正确，移除空格
    };

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    return fetch(url, options)
        .then(response => {
            if (response.status === 401) {
                // 令牌过期或无效，重定向到登录页面
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject('未授权');
            }
            return response.json();
        });
}

// 添加全局请求拦截器，统一处理令牌
function setupAuthInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = function (url, options = {}) {
        // 对API请求添加认证头
        if (url.includes('/api/') && !url.includes('/api/auth/login')) {
            const token = localStorage.getItem('token');
            if (token) {
                // 确保options.headers存在
                options.headers = options.headers || {};

                // 添加Authorization头，确保格式正确
                const cleanToken = token.trim();
                options.headers['Authorization'] = `Bearer ${cleanToken}`;

                console.log(`请求 ${url} 添加令牌: Bearer ${cleanToken.substring(0, 15)}...`);
            }
        }

        return originalFetch.call(this, url, options);
    };
}

// 页面加载时设置拦截器
document.addEventListener('DOMContentLoaded', function () {
    setupAuthInterceptor();
    console.log("认证拦截器已设置");
});

// 页面加载时检查登录状态，如果未登录则重定向到登录页面
document.addEventListener('DOMContentLoaded', function () {
    // 登录页面不需要检查
    if (window.location.pathname === '/login') {
        return;
    }

    // 检查登录状态
    if (!checkAuthenticated()) {
        window.location.href = '/login';
    }
});