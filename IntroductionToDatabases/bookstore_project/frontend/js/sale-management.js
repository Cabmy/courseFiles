// 销售管理功能模块
const SaleManagement = {
    books: [],
    sales: [],

    // 标记是否已初始化
    initialized: false,

    // 初始化
    init() {
        if (!this.initialized) {
            this.bindEvents();
            this.initialized = true;
        }
        this.loadSales();
        this.loadBooks(); // 用于销售图书选择
    },

    // 绑定事件
    bindEvents() {
        // 销售搜索事件
        document.getElementById('search-sale-btn').addEventListener('click', () => {
            this.loadSales();
        });

        // 销售表单提交事件
        document.getElementById('add-sale-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSale();
        });

        // 日期筛选变更事件
        document.getElementById('sale-start-date').addEventListener('change', () => {
            this.loadSales();
        });

        document.getElementById('sale-end-date').addEventListener('change', () => {
            this.loadSales();
        });

        // 图书选择变更事件
        document.getElementById('sale-book-id').addEventListener('change', () => {
            const bookSelect = document.getElementById('sale-book-id');
            const selectedOption = bookSelect.options[bookSelect.selectedIndex];
            if (selectedOption.value) {
                const retailPrice = parseFloat(selectedOption.getAttribute('data-price'));
                const maxStock = parseInt(selectedOption.getAttribute('data-stock'));

                document.getElementById('sale-price').value = retailPrice.toFixed(2);
                document.getElementById('sale-quantity').max = maxStock;
                document.getElementById('sale-quantity').value = 1;
                this.updateSaleTotal();
            }
        });

        // 销售数量和价格变更事件，用于计算总金额
        document.getElementById('sale-quantity').addEventListener('input', () => {
            this.updateSaleTotal();
        });

        document.getElementById('sale-price').addEventListener('input', () => {
            this.updateSaleTotal();
        });
    },

    // 加载销售记录列表
    async loadSales() {
        UI.showLoading('sales-table-body');

        try {
            // 获取筛选条件
            const startDate = document.getElementById('sale-start-date').value;
            const endDate = document.getElementById('sale-end-date').value;

            const params = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const response = await API.sale.getAllSales(params);
            this.sales = response.sales;

            const tableBody = document.getElementById('sales-table-body');
            tableBody.innerHTML = '';

            if (this.sales.length > 0) {
                this.sales.forEach(sale => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${sale.sale_id}</td>
                            <td>${sale.book_title}</td>
                            <td>${sale.quantity}</td>
                            <td>${UI.formatCurrency(sale.sale_price)}</td>
                            <td>${UI.formatCurrency(sale.total_amount)}</td>
                            <td>${UI.formatDate(sale.sale_time)}</td>
                            <td>${sale.seller_name}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary action-btn"
                                        onclick="SaleManagement.showSaleDetails(${sale.sale_id})">
                                    详情
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">暂无销售记录</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('加载销售记录失败:', error);
            UI.showError('sales-table-body', '加载销售记录失败: ' + error.message);
        }
    },

    // 加载图书列表（用于销售选择）
    async loadBooks() {
        try {
            const response = await API.book.getAllBooks();
            this.books = response.books;

            const bookSelect = document.getElementById('sale-book-id');
            bookSelect.innerHTML = '<option value="">选择图书</option>';

            this.books.forEach(book => {
                // 只显示有库存的图书
                if (book.stock > 0) {
                    bookSelect.innerHTML += `
                        <option value="${book.book_id}" data-price="${book.retail_price}" data-stock="${book.stock}">
                            ${book.title} (库存: ${book.stock})
                        </option>
                    `;
                }
            });
        } catch (error) {
            console.error('加载图书列表失败:', error);
        }
    },

    // 更新销售总金额
    updateSaleTotal() {
        const quantity = parseInt(document.getElementById('sale-quantity').value) || 0;
        const price = parseFloat(document.getElementById('sale-price').value) || 0;
        const totalAmount = quantity * price;

        document.getElementById('sale-total').textContent = UI.formatCurrency(totalAmount);
    },

    // 打开销售对话框
    openSaleDialog(bookId = null) {
        // 重置表单
        document.getElementById('add-sale-form').reset();
        document.getElementById('sale-total').textContent = UI.formatCurrency(0);

        // 如果指定了图书ID，则预选该图书
        if (bookId) {
            // 等待图书列表加载完成后选择
            setTimeout(() => {
                const bookSelect = document.getElementById('sale-book-id');
                bookSelect.value = bookId;

                // 触发change事件以更新价格和库存限制
                bookSelect.dispatchEvent(new Event('change'));
            }, 500);
        }

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('addSaleModal'));
        modal.show();
    },    // 防重复提交标志
    isSubmitting: false,

    // 添加销售记录
    async addSale() {
        // 防止重复提交
        if (this.isSubmitting) {
            console.log('正在处理上一次提交，请勿重复操作');
            return;
        }

        const saleData = {
            book_id: parseInt(document.getElementById('sale-book-id').value),
            quantity: parseInt(document.getElementById('sale-quantity').value),
            sale_price: parseFloat(document.getElementById('sale-price').value),
            remark: document.getElementById('sale-remark').value
        };

        // 验证表单
        if (!saleData.book_id) {
            alert('请选择图书');
            return;
        }

        if (!saleData.quantity || saleData.quantity <= 0) {
            alert('请输入有效的销售数量');
            return;
        }

        if (!saleData.sale_price || saleData.sale_price <= 0) {
            alert('请输入有效的销售价格');
            return;
        }

        try {
            this.isSubmitting = true;

            // 禁用提交按钮
            const submitBtn = document.querySelector('#addSaleModal .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';
            }

            await API.sale.createSale(saleData);
            alert('销售记录添加成功');

            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('addSaleModal')).hide();

            // 重新加载销售列表和图书列表（更新库存）
            this.loadSales();
            this.loadBooks();

            // 同时也更新仪表板数据
            Dashboard.loadData();
        } catch (error) {
            alert('添加销售记录失败: ' + error.message);
        } finally {
            // 无论成功或失败，都重置提交状态
            this.isSubmitting = false;

            // 恢复按钮状态
            const submitBtn = document.querySelector('#addSaleModal .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '保存';
            }
        }
    },

    // 显示销售详情
    async showSaleDetails(saleId) {
        try {
            const response = await API.sale.getSale(saleId);
            const sale = response.sale;

            const detailContent = `
                <div class="modal-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p><strong>销售单号:</strong> ${sale.sale_id}</p>
                            <p><strong>图书名称:</strong> ${sale.book_title}</p>
                            <p><strong>销售数量:</strong> ${sale.quantity}</p>
                            <p><strong>销售单价:</strong> ${UI.formatCurrency(sale.sale_price)}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>销售总额:</strong> ${UI.formatCurrency(sale.total_amount)}</p>
                            <p><strong>销售时间:</strong> ${UI.formatDate(sale.sale_time)}</p>
                            <p><strong>销售员:</strong> ${sale.seller_name}</p>
                            <p><strong>备注:</strong> ${sale.remark || '无'}</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('sale-detail-content').innerHTML = detailContent;

            // 显示模态框
            const modal = new bootstrap.Modal(document.getElementById('saleDetailModal'));
            modal.show();
        } catch (error) {
            console.error('获取销售详情失败:', error);
            alert('获取销售详情失败: ' + error.message);
        }
    },

    // 加载销售统计数据
    async loadSalesStatistics() {
        try {
            const response = await API.sale.getSalesStatistics();
            const tableBody = document.getElementById('sales-statistics-body');
            tableBody.innerHTML = '';

            if (response.statistics.length > 0) {
                response.statistics.forEach(item => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${item.title}</td>
                            <td>${item.author}</td>
                            <td>${item.isbn}</td>
                            <td>${item.total_sold}</td>
                            <td>${UI.formatCurrency(item.total_revenue)}</td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">暂无销售统计数据</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('加载销售统计失败:', error);
            UI.showError('sales-statistics-body', '加载销售统计失败: ' + error.message);
        }
    },

    // 加载员工销售业绩
    async loadSalesPerformance() {
        try {
            const response = await API.sale.getUserPerformance();
            const tableBody = document.getElementById('sales-performance-body');
            tableBody.innerHTML = '';

            if (response.performance.length > 0) {
                response.performance.forEach(item => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${item.real_name}</td>
                            <td>${item.total_sales}</td>
                            <td>${item.total_items_sold}</td>
                            <td>${UI.formatCurrency(item.total_revenue)}</td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">暂无销售业绩数据</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('加载销售业绩失败:', error);
            UI.showError('sales-performance-body', '加载销售业绩失败: ' + error.message);
        }
    }
};