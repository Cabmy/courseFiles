// 用户管理功能模块
const UserManagement = {
    users: [],
    eventsBound: false, // 添加标记，记录事件是否已绑定

    // 初始化
    init() {
        // 检查是否有管理员权限
        if (!Auth.hasPermission('admin')) {
            UI.showError('user-management', '您没有权限访问用户管理功能');
            return;
        }

        // 只绑定事件一次
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }

        this.loadUsers();
    },

    // 绑定事件
    bindEvents() {
        // 添加用户表单提交事件
        document.getElementById('add-user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        // 编辑用户表单提交事件
        document.getElementById('edit-user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUser();
        });
    },

    // 加载用户列表
    async loadUsers() {
        UI.showLoading('users-table-body');

        try {
            const response = await API.user.getAllUsers();
            this.users = response.users;

            const tableBody = document.getElementById('users-table-body');
            tableBody.innerHTML = '';

            if (this.users.length > 0) {
                this.users.forEach(user => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${user.user_id}</td>
                            <td>${user.username}</td>
                            <td>${user.real_name}</td>
                            <td>${user.employee_id}</td>
                            <td>${user.gender}</td>
                            <td>${user.age || '-'}</td>
                            <td>${user.role}</td>
                            <td>${UI.formatDate(user.created_at)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary action-btn" 
                                        onclick="UserManagement.openEditDialog(${user.user_id})">
                                    编辑
                                </button>
                                ${user.user_id !== Auth.currentUser.user_id ? `
                                <button class="btn btn-sm btn-outline-danger action-btn" 
                                        onclick="UserManagement.confirmDelete(${user.user_id})">
                                    删除
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center">暂无用户数据</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('加载用户列表失败:', error);
            UI.showError('users-table-body', '加载用户列表失败: ' + error.message);
        }
    },

    // 打开创建用户对话框
    openCreateDialog() {
        // 重置表单
        document.getElementById('add-user-form').reset();

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
        modal.show();
    },

    // 添加新用户
    async addUser() {
        const userData = {
            username: document.getElementById('add-username').value.trim(),
            password: document.getElementById('add-password').value.trim(),
            real_name: document.getElementById('real-name').value.trim(),
            employee_id: document.getElementById('employee-id').value.trim(),
            gender: document.getElementById('gender').value,
            age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null,
            role: document.getElementById('role').value
        };

        // 验证表单
        if (!userData.username || !userData.password || !userData.real_name ||
            !userData.employee_id || !userData.gender || !userData.role) {
            alert('请填写所有必填字段');
            console.log('表单验证失败，当前数据:', userData);
            return;
        }

        try {
            await API.user.createUser(userData);
            alert('用户创建成功');

            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();

            // 重新加载用户列表
            this.loadUsers();
        } catch (error) {
            alert('创建用户失败: ' + error.message);
        }
    },

    // 打开编辑用户对话框
    openEditDialog(userId) {
        const user = this.users.find(u => u.user_id === userId);
        if (!user) return;

        document.getElementById('edit-user-id').value = user.user_id;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-password').value = '';  // 密码不回填
        document.getElementById('edit-real-name').value = user.real_name;
        document.getElementById('edit-employee-id').value = user.employee_id;
        document.getElementById('edit-gender').value = user.gender;
        document.getElementById('edit-age').value = user.age || '';
        document.getElementById('edit-role').value = user.role;

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    },

    // 更新用户信息
    async updateUser() {
        const userId = parseInt(document.getElementById('edit-user-id').value);
        const userData = {
            real_name: document.getElementById('edit-real-name').value,
            employee_id: document.getElementById('edit-employee-id').value,
            gender: document.getElementById('edit-gender').value,
            age: document.getElementById('edit-age').value ? parseInt(document.getElementById('edit-age').value) : null,
            role: document.getElementById('edit-role').value
        };

        // 如果输入了密码，则更新密码
        const password = document.getElementById('edit-password').value;
        if (password) {
            userData.password = password;
        }

        try {
            await API.user.updateUser(userId, userData);
            alert('用户信息更新成功');

            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();

            // 重新加载用户列表
            this.loadUsers();

            // 如果更新的是当前用户，刷新用户信息
            if (userId === Auth.currentUser.user_id) {
                Auth.init();
            }
        } catch (error) {
            alert('更新用户信息失败: ' + error.message);
        }
    },

    // 确认删除用户
    confirmDelete(userId) {
        if (confirm('确定要删除该用户吗？此操作不可撤销。')) {
            this.deleteUser(userId);
        }
    },

    // 删除用户
    async deleteUser(userId) {
        try {
            await API.user.deleteUser(userId);
            alert('用户删除成功');

            // 重新加载用户列表
            this.loadUsers();
        } catch (error) {
            alert('删除用户失败: ' + error.message);
        }
    }
};