// API客户端模块
const API = {
    baseUrl: CONFIG.apiBaseUrl,

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = this.baseUrl + endpoint;
        console.log('API请求URL:', url);

        // 默认选项
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'  // 包含cookie以支持会话认证
        };

        // 合并选项
        const fetchOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        console.log('请求选项:', JSON.stringify(fetchOptions, null, 2));

        // 如果有请求体且为JSON格式，转换为字符串
        if (fetchOptions.body && typeof fetchOptions.body === 'object') {
            fetchOptions.body = JSON.stringify(fetchOptions.body);
        }

        try {
            const response = await fetch(url, fetchOptions);
            console.log('API响应状态:', response.status, response.statusText);

            // 获取原始响应文本
            const responseText = await response.text();
            console.log('API原始响应:', responseText);

            // 尝试解析为JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('响应不是有效的JSON:', responseText);
                throw new Error('服务器响应不是有效的JSON格式');
            }

            // 如果响应不成功，抛出详细错误
            if (!response.ok) {
                console.error('API错误响应:', data);
                throw new Error(data.error || `请求失败: ${response.status} ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    },

    // 认证相关接口
    auth: {
        // 登录
        login(username, password) {
            return API.request('/users/login', {
                method: 'POST',
                body: { username, password }
            });
        },

        // 登出
        logout() {
            return API.request('/users/logout', {
                method: 'POST'
            });
        },

        // 获取当前用户信息
        getCurrentUser() {
            return API.request('/users/profile');
        }
    },

    // 用户管理接口
    user: {
        // 获取所有用户
        getAllUsers() {
            return API.request('/users/');
        },

        // 创建用户
        createUser(userData) {
            return API.request('/users/', {
                method: 'POST',
                body: userData
            });
        },

        // 获取单个用户
        getUser(userId) {
            return API.request(`/users/${userId}`);
        },

        // 更新用户
        updateUser(userId, userData) {
            return API.request(`/users/${userId}`, {
                method: 'PUT',
                body: userData
            });
        },

        // 删除用户
        deleteUser(userId) {
            return API.request(`/users/${userId}`, {
                method: 'DELETE'
            });
        }
    },

    // 图书管理接口
    book: {
        // 获取所有图书
        getAllBooks(searchQuery = '') {
            let endpoint = '/books/';
            if (searchQuery) {
                endpoint += `?search=${encodeURIComponent(searchQuery)}`;
            }
            return API.request(endpoint);
        },

        // 获取低库存图书
        getLowStockBooks() {
            return API.request('/books/low-stock');
        },

        // 创建图书
        createBook(bookData) {
            return API.request('/books/', {
                method: 'POST',
                body: bookData
            });
        },

        // 获取单本图书
        getBook(bookId) {
            return API.request(`/books/${bookId}`);
        },

        // 更新图书
        updateBook(bookId, bookData) {
            return API.request(`/books/${bookId}`, {
                method: 'PUT',
                body: bookData
            });
        },

        // 删除图书
        deleteBook(bookId) {
            return API.request(`/books/${bookId}`, {
                method: 'DELETE'
            });
        }
    },

    // 销售管理接口
    sale: {
        // 获取所有销售记录
        getAllSales(params = {}) {
            // 构建查询参数
            const queryParams = new URLSearchParams();
            for (const key in params) {
                if (params[key]) {
                    queryParams.append(key, params[key]);
                }
            }

            const queryString = queryParams.toString();
            const endpoint = queryString ? `/sales/?${queryString}` : '/sales/';

            return API.request(endpoint);
        },

        // 创建销售记录
        createSale(saleData) {
            return API.request('/sales/', {
                method: 'POST',
                body: saleData
            });
        },

        // 获取单条销售记录
        getSale(saleId) {
            return API.request(`/sales/${saleId}`);
        },

        // 获取销售统计
        getSalesStatistics() {
            return API.request('/sales/statistics');
        },

        // 获取用户销售业绩
        getUserPerformance() {
            return API.request('/sales/performance');
        }
    },

    // 进货管理接口
    purchase: {
        // 获取所有进货单
        getAllPurchases(statusFilter = '') {
            let endpoint = '/purchases/';
            if (statusFilter) {
                endpoint += `?status=${encodeURIComponent(statusFilter)}`;
            }
            return API.request(endpoint);
        },

        // 创建进货单
        createPurchase(purchaseData) {
            return API.request('/purchases/', {
                method: 'POST',
                body: purchaseData
            });
        },

        // 获取单个进货单详情
        getPurchase(purchaseId) {
            return API.request(`/purchases/${purchaseId}`);
        },

        // 更新进货单
        updatePurchase(purchaseId, purchaseData) {
            return API.request(`/purchases/${purchaseId}`, {
                method: 'PUT',
                body: purchaseData
            });
        },

        // 支付进货单
        payPurchase(purchaseId) {
            return API.request(`/purchases/${purchaseId}/pay`, {
                method: 'POST'
            });
        },

        // 取消进货单
        cancelPurchase(purchaseId) {
            return API.request(`/purchases/${purchaseId}/cancel`, {
                method: 'POST'
            });
        },

        // 添加新书到库存
        addNewBookToStock(detailId, retailPrice) {
            return API.request(`/purchases/details/${detailId}/add-book`, {
                method: 'POST',
                body: { retail_price: retailPrice }
            });
        }
    },

    // 财务管理接口
    finance: {
        // 获取所有财务记录
        getAllFinancialRecords(params = {}) {
            // 构建查询参数
            const queryParams = new URLSearchParams();
            for (const key in params) {
                if (params[key]) {
                    queryParams.append(key, params[key]);
                }
            }

            const queryString = queryParams.toString();
            const endpoint = queryString ? `/finance/?${queryString}` : '/finance/';

            return API.request(endpoint);
        },

        // 获取财务概况
        getFinanceSummary() {
            return API.request('/finance/summary');
        },

        // 获取月度统计数据
        getMonthlyStatistics(year) {
            return API.request(`/finance/monthly?year=${year}`);
        },

        // 获取销售利润分析
        getSalesProfit() {
            return API.request('/finance/sales-profit');
        }
    },

    // 仪表盘接口
    dashboard: {
        // 获取仪表盘概览数据
        getOverview() {
            return API.request('/dashboard/overview');
        },

        // 获取销售排行数据
        getSalesRanking() {
            return API.request('/dashboard/sales-ranking');
        }
    }
};