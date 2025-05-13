// 认证管理模块
const Auth = {
    currentUser: null,

    // 初始化认证状态
    async init() {
        // 检查是否已登录
        try {
            const response = await API.auth.getCurrentUser();
            this.currentUser = response.user;
            this.updateUI();

            // 显示仪表盘
            UI.showPage('dashboard');

            // 初始化仪表盘数据
            Dashboard.loadData();

            return true;
        } catch (error) {
            this.currentUser = null;
            // 显示登录页面
            UI.showLoginPage();
            return false;
        }
    },

    // 用户登录
    async login(username, password) {
        try {
            const response = await API.auth.login(username, password);
            this.currentUser = response.user;
            this.updateUI();

            // 显示仪表盘
            UI.showPage('dashboard');

            // 初始化仪表盘数据
            Dashboard.loadData();

            return true;
        } catch (error) {
            alert('登录失败: ' + error.message);
            return false;
        }
    },

    // 用户登出
    async logout() {
        try {
            await API.auth.logout();
            this.currentUser = null;
            UI.showLoginPage();
            return true;
        } catch (error) {
            alert('登出失败: ' + error.message);
            return false;
        }
    },

    // 检查用户是否有特定权限
    hasPermission(permission) {
        if (!this.currentUser) return false;

        // 超级管理员拥有所有权限
        if (this.currentUser.role === '超级管理员') {
            return true;
        }

        // 普通管理员有普通权限，没有用户管理权限
        if (this.currentUser.role === '普通管理员') {
            if (permission === 'admin') {
                return false;
            }
            return true;
        }

        return false;
    },

    // 更新UI上的用户信息
    updateUI() {
        if (this.currentUser) {
            document.getElementById('current-user').textContent = `${this.currentUser.real_name} (${this.currentUser.role})`;

            // 根据用户角色显示/隐藏管理员功能
            const adminElements = document.querySelectorAll('.admin-only');
            if (this.hasPermission('admin')) {
                adminElements.forEach(el => el.style.display = 'block');
            } else {
                adminElements.forEach(el => el.style.display = 'none');
            }
        } else {
            document.getElementById('current-user').textContent = '未登录';
        }
    }
};

// 页面加载完成后初始化认证模块
document.addEventListener('DOMContentLoaded', () => {
    // 绑定登录表单事件
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        await Auth.login(username, password);
    });

    // 绑定登出按钮事件
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await Auth.logout();
    });

    // 初始化认证状态
    Auth.init();
});