// 主脚本文件

// UI工具模块，处理界面相关功能
const UI = {
    // 显示指定页面
    showPage(pageId) {
        // 隐藏所有内容页面
        document.querySelectorAll('.content-page').forEach(page => {
            page.style.display = 'none';
        });

        // 取消所有导航项的激活状态
        document.querySelectorAll('.nav-link').forEach(navLink => {
            navLink.classList.remove('active');
        });

        // 显示指定页面
        const page = document.getElementById(pageId);
        if (page) {
            page.style.display = 'block';

            // 激活对应的导航项
            const navLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }

            // 根据页面类型初始化内容
            this.initPageContent(pageId);
        }

        // 隐藏登录页面
        document.getElementById('login-page').style.display = 'none';

        // 显示侧边栏
        document.getElementById('sidebar').style.display = 'block';
    },

    // 显示登录页面
    showLoginPage() {
        // 隐藏所有内容页面
        document.querySelectorAll('.content-page').forEach(page => {
            page.style.display = 'none';
        });

        // 显示登录页面
        document.getElementById('login-page').style.display = 'block';

        // 隐藏侧边栏
        document.getElementById('sidebar').style.display = 'none';
    },

    // 根据页面类型初始化内容
    initPageContent(pageId) {
        switch (pageId) {
            case 'dashboard':
                Dashboard.loadData();
                break;
            case 'book-management':
                BookManagement.init();
                break;
            case 'sale-management':
                SaleManagement.init();
                break;
            case 'purchase-management':
                PurchaseManagement.init();
                break;
            case 'finance-management':
                FinanceManagement.init();
                break;
            case 'user-management':
                UserManagement.init();
                break;
        }
    },

    // 显示加载状态
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <tr>
                    <td colspan="100" class="text-center p-3">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <span class="ms-2">加载中...</span>
                    </td>
                </tr>
            `;
        }
    },

    // 显示错误信息
    showError(elementId, errorMessage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <tr>
                    <td colspan="100" class="text-center p-3 text-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        ${errorMessage}
                    </td>
                </tr>
            `;
        }
    },

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '-';

        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', CONFIG.dateFormat);
    },

    // 格式化金额
    formatCurrency(amount) {
        return parseFloat(amount || 0).toLocaleString('zh-CN', CONFIG.currencyFormat);
    }
};

// 仪表盘模块
const Dashboard = {
    // 加载仪表盘数据
    async loadData() {
        try {
            // 加载概览数据
            const overview = await API.dashboard.getOverview();

            // 更新统计数据
            document.getElementById('total-books').textContent = overview.totalBooks || 0;
            document.getElementById('low-stock-books').textContent = overview.lowStockBooks || 0;
            document.getElementById('today-sales').textContent = overview.todaySales || 0;
            document.getElementById('today-revenue').textContent = UI.formatCurrency(overview.todayRevenue);
            document.getElementById('monthly-income').textContent = UI.formatCurrency(overview.monthlyIncome);
            document.getElementById('monthly-expense').textContent = UI.formatCurrency(overview.monthlyExpense);

            // 加载销售排行
            await this.loadSalesRanking();

            // 加载库存预警
            await this.loadLowStockBooks();
        } catch (error) {
            alert('加载仪表盘数据失败: ' + error.message);
        }
    },

    // 加载销售排行
    async loadSalesRanking() {
        try {
            // 显示加载状态
            UI.showLoading('sales-ranking');

            const response = await API.dashboard.getSalesRanking();

            // 修正：使用正确的数据结构 ranking_data.book_ranking
            const bookRanking = response.ranking_data?.book_ranking || [];

            const tableBody = document.getElementById('sales-ranking');
            tableBody.innerHTML = '';

            if (bookRanking.length > 0) {
                bookRanking.forEach(item => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${item.title}</td>
                            <td>${item.total_quantity}</td>
                            <td>${UI.formatCurrency(item.total_revenue)}</td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="3" class="text-center">暂无销售数据</td></tr>';
            }
        } catch (error) {
            UI.showError('sales-ranking', '加载销售排行失败: ' + error.message);
        }
    },    // 加载库存预警
    async loadLowStockBooks() {
        try {
            // 显示加载状态
            UI.showLoading('low-stock-list');

            const response = await API.book.getLowStockBooks();
            const lowStockBooks = response.books;

            const tableBody = document.getElementById('low-stock-list');
            tableBody.innerHTML = ''; if (lowStockBooks.length > 0) {
                lowStockBooks.forEach(book => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${book.title}</td>
                            <td>
                                <span class="${book.stock === 0 ? 'text-danger' : 'text-warning'}">
                                    ${book.stock}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary quick-purchase-btn" 
                                    data-book-id="${book.book_id}" onclick="event.preventDefault();">
                                    快速进货
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="3" class="text-center">没有库存预警</td></tr>';
            }
        } catch (error) {
            UI.showError('low-stock-list', '加载库存预警失败: ' + error.message);
        }
    }
};

// 图书管理模块
const BookManagement = {
    books: [],
    // 是否已初始化事件
    eventsBound: false,

    // 初始化
    init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        this.loadBooks();
    },

    // 绑定事件
    bindEvents() {
        // 搜索事件
        document.getElementById('search-book-btn').addEventListener('click', () => {
            this.searchBooks();
        });

        // 回车搜索
        document.getElementById('book-search').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.searchBooks();
            }
        });

        // 添加图书表单提交
        document.getElementById('add-book-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBook();
        });

        // 编辑图书表单提交
        document.getElementById('edit-book-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBook();
        });
    },

    // 加载所有图书
    async loadBooks(searchQuery = '') {
        UI.showLoading('books-table-body');

        try {
            const response = await API.book.getAllBooks(searchQuery);
            this.books = response.books;

            const tableBody = document.getElementById('books-table-body');
            tableBody.innerHTML = '';

            if (this.books.length > 0) {
                this.books.forEach(book => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${book.book_id}</td>
                            <td>${book.isbn}</td>
                            <td>${book.title}</td>
                            <td>${book.author}</td>
                            <td>${book.publisher}</td>
                            <td>${UI.formatCurrency(book.retail_price)}</td>
                            <td>${this.getStockCell(book.stock)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary action-btn"
                                        onclick="BookManagement.openEditDialog(${book.book_id})">
                                    编辑
                                </button>
                                <button class="btn btn-sm btn-outline-danger action-btn"
                                        onclick="BookManagement.confirmDelete(${book.book_id})">
                                    删除
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">暂无图书数据</td>
                    </tr>
                `;
            }
        } catch (error) {
            UI.showError('books-table-body', '加载图书列表失败: ' + error.message);
        }
    },

    // 根据库存生成对应的HTML
    getStockCell(stock) {
        if (stock <= 0) {
            return `<span class="badge bg-danger">无库存</span>`;
        } else if (stock < CONFIG.lowStockThreshold) {
            return `<span class="badge bg-warning text-dark">${stock}</span>`;
        } else {
            return `<span class="badge bg-success">${stock}</span>`;
        }
    },

    // 搜索图书
    searchBooks() {
        const searchQuery = document.getElementById('book-search').value.trim();
        this.loadBooks(searchQuery);
    },    // 防重复提交标志
    isSubmittingBook: false,

    // 添加新图书
    async addBook() {        // 防止重复提交
        if (this.isSubmittingBook) {
            return;
        }

        const bookData = {
            isbn: document.getElementById('isbn').value,
            title: document.getElementById('title').value,
            author: document.getElementById('author').value,
            publisher: document.getElementById('publisher').value,
            retail_price: parseFloat(document.getElementById('retail-price').value),
            stock: parseInt(document.getElementById('stock').value) || 0
        };

        try {
            this.isSubmittingBook = true;

            // 禁用提交按钮
            const submitBtn = document.querySelector('#addBookModal .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';
            }

            await API.book.createBook(bookData);
            alert('图书添加成功');

            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('addBookModal')).hide();

            // 清空表单
            document.getElementById('add-book-form').reset();

            // 重新加载图书列表
            this.loadBooks();
        } catch (error) {
            alert('添加图书失败: ' + error.message);
        } finally {
            // 无论成功或失败，都重置提交状态
            this.isSubmittingBook = false;

            // 恢复按钮状态
            const submitBtn = document.querySelector('#addBookModal .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '保存';
            }
        }
    },

    // 打开编辑对话框
    openEditDialog(bookId) {
        const book = this.books.find(b => b.book_id === bookId);
        if (!book) return;

        document.getElementById('edit-book-id').value = book.book_id;
        document.getElementById('edit-isbn').value = book.isbn;
        document.getElementById('edit-title').value = book.title;
        document.getElementById('edit-author').value = book.author;
        document.getElementById('edit-publisher').value = book.publisher;
        document.getElementById('edit-retail-price').value = book.retail_price;
        document.getElementById('edit-stock').value = book.stock;

        const modal = new bootstrap.Modal(document.getElementById('editBookModal'));
        modal.show();
    },

    // 更新图书信息
    async updateBook() {
        const bookId = parseInt(document.getElementById('edit-book-id').value);
        const bookData = {
            isbn: document.getElementById('edit-isbn').value,
            title: document.getElementById('edit-title').value,
            author: document.getElementById('edit-author').value,
            publisher: document.getElementById('edit-publisher').value,
            retail_price: parseFloat(document.getElementById('edit-retail-price').value),
            stock: parseInt(document.getElementById('edit-stock').value) || 0
        };

        try {
            await API.book.updateBook(bookId, bookData);
            alert('图书更新成功');

            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('editBookModal')).hide();

            // 重新加载图书列表
            this.loadBooks();
        } catch (error) {
            alert('更新图书失败: ' + error.message);
        }
    },

    // 确认删除
    confirmDelete(bookId) {
        if (confirm('确定要删除这本图书吗？此操作不可撤销！')) {
            this.deleteBook(bookId);
        }
    },

    // 删除图书
    async deleteBook(bookId) {
        try {
            await API.book.deleteBook(bookId);
            alert('图书删除成功');

            // 重新加载图书列表
            this.loadBooks();
        } catch (error) {
            alert('删除图书失败: ' + error.message);
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 绑定导航点击事件
    document.querySelectorAll('.nav-link[data-page]').forEach(navLink => {
        navLink.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.target.closest('.nav-link').dataset.page;
            UI.showPage(pageId);
        });
    });

    // 绑定首页概览卡片中"查看详情"按钮的点击事件
    document.querySelectorAll('#dashboard .card .btn[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.target.dataset.page;
            UI.showPage(pageId);
        });
    });
});