// 进货管理功能模块
const PurchaseManagement = {
    books: [],
    orders: [],
    currentOrderDetails: [],
    eventsBound: false, // 标记事件是否已绑定

    // 初始化
    init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        this.loadBooks();
        this.loadOrders();
    },

    // 绑定事件处理
    bindEvents() {
        // 进货单筛选事件
        document.getElementById('purchase-status-filter').addEventListener('change', () => {
            this.loadOrders();
        });

        // 新增进货单事件
        document.getElementById('create-purchase-btn').addEventListener('click', () => {
            this.openCreateOrderDialog();
        });

        // 添加明细项按钮事件
        document.getElementById('add-detail-item-btn').addEventListener('click', () => {
            this.addDetailItem();
        });

        // 保存进货单表单提交事件
        document.getElementById('purchase-order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePurchaseOrder();
        });

        // 新书/已有图书切换事件
        const isNewBookCheckbox = document.getElementById('is-new-book');
        if (isNewBookCheckbox) {
            isNewBookCheckbox.addEventListener('change', () => {
                this.toggleBookInputForm();
            });
        }

        // 添加新书到库存表单提交事件
        const addToStockBtn = document.getElementById('add-to-stock-btn');
        if (addToStockBtn) {
            addToStockBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addNewBookToStock();
            });
        }
    },    // 加载所有图书
    async loadBooks() {
        try {
            const response = await API.book.getAllBooks();
            this.books = response.books;

            // 更新图书下拉列表
            this.updateBookSelect();

            // 显式返回resolved的Promise
            return Promise.resolve();
        } catch (error) {
            console.error('加载图书列表失败:', error);
            // 返回rejected的Promise
            return Promise.reject(error);
        }
    },

    // 更新图书选择下拉列表
    updateBookSelect() {
        const bookSelect = document.getElementById('existing-book-select');
        if (!bookSelect) return;

        bookSelect.innerHTML = '<option value="">-- 选择已有图书 --</option>';

        this.books.forEach(book => {
            bookSelect.innerHTML += `
                <option value="${book.book_id}" data-isbn="${book.isbn}" data-title="${book.title}" 
                        data-author="${book.author}" data-publisher="${book.publisher}">
                    ${book.title} (ISBN: ${book.isbn})
                </option>
            `;
        });
    },

    // 加载进货单列表
    async loadOrders() {
        UI.showLoading('purchase-orders-table-body');

        try {
            // 获取状态筛选
            const statusFilter = document.getElementById('purchase-status-filter').value;

            const response = await API.purchase.getAllPurchases(statusFilter);
            this.orders = response.orders;

            const tableBody = document.getElementById('purchase-orders-table-body');
            tableBody.innerHTML = '';

            if (this.orders.length > 0) {
                this.orders.forEach(order => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${order.order_id}</td>
                            <td>${order.creator_name}</td>
                            <td>${UI.formatDate(order.create_time)}</td>
                            <td>${order.status}</td>
                            <td>${UI.formatCurrency(order.total_amount)}</td>
                            <td>${order.details.length}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary action-btn" 
                                        onclick="PurchaseManagement.showOrderDetails(${order.order_id})">
                                    详情
                                </button>
                                ${order.status === '未付款' ? `
                                <button class="btn btn-sm btn-outline-success action-btn" 
                                        onclick="PurchaseManagement.payOrder(${order.order_id})">
                                    付款
                                </button>                                <button class="btn btn-sm btn-outline-danger action-btn" 
                                        onclick="PurchaseManagement.cancelOrder(${order.order_id})">
                                    退货
                                </button>
                                ` : ''}
                                ${order.status === '已付款' && order.details.some(detail => detail.is_new_book) ? `
                                <button class="btn btn-sm btn-outline-info action-btn" 
                                        onclick="PurchaseManagement.showAddNewBooksDialog(${order.order_id})">
                                    添加新书
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">暂无进货单记录</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('加载进货单列表失败:', error);
            UI.showError('purchase-orders-table-body', '加载进货单列表失败: ' + error.message);
        }
    },

    // 打开创建进货单对话框
    openCreateOrderDialog() {
        // 重置表单和明细列表
        document.getElementById('purchase-order-form').reset();
        this.currentOrderDetails = [];
        this.updateDetailItemsTable();

        // 切换到创建模式
        document.getElementById('purchase-modal-title').textContent = '创建进货单';
        document.getElementById('purchase-order-id').value = '';

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('purchaseOrderModal'));
        modal.show();
    },

    // 更新明细项表格
    updateDetailItemsTable() {
        const tableBody = document.getElementById('detail-items-body');
        tableBody.innerHTML = '';

        if (this.currentOrderDetails.length > 0) {
            this.currentOrderDetails.forEach((detail, index) => {
                tableBody.innerHTML += `
                    <tr>
                        <td>${detail.is_new_book ? '新书' : '已有图书'}</td>
                        <td>${detail.title}</td>
                        <td>${detail.author || '-'}</td>
                        <td>${detail.publisher || '-'}</td>
                        <td>${detail.quantity}</td>
                        <td>${UI.formatCurrency(detail.purchase_price)}</td>
                        <td>${UI.formatCurrency(detail.quantity * detail.purchase_price)}</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-outline-danger" 
                                    onclick="PurchaseManagement.removeDetailItem(${index})">
                                删除
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">暂无进货明细，请添加</td>
                </tr>
            `;
        }

        // 更新总金额
        this.updateOrderTotal();
    },

    // 更新订单总金额
    updateOrderTotal() {
        let total = 0;
        this.currentOrderDetails.forEach(detail => {
            total += detail.quantity * detail.purchase_price;
        });

        document.getElementById('order-total-amount').textContent = UI.formatCurrency(total);
    },

    // 添加明细项
    addDetailItem() {
        // 获取是否是新书
        const isNewBook = document.getElementById('is-new-book').checked;

        let detail = {
            quantity: parseInt(document.getElementById('detail-quantity').value) || 0,
            purchase_price: parseFloat(document.getElementById('detail-purchase-price').value) || 0
        };

        // 验证基本字段
        if (detail.quantity <= 0) {
            alert('请输入有效的数量');
            return;
        }

        if (detail.purchase_price <= 0) {
            alert('请输入有效的进货价格');
            return;
        }

        // 根据是否是新书获取不同字段
        if (isNewBook) {
            // 新书需要录入基本信息
            detail.is_new_book = true;
            detail.isbn = document.getElementById('new-book-isbn').value.trim();
            detail.title = document.getElementById('new-book-title').value.trim();
            detail.author = document.getElementById('new-book-author').value.trim();
            detail.publisher = document.getElementById('new-book-publisher').value.trim();

            // 验证新书信息
            if (!detail.isbn || !detail.title || !detail.author || !detail.publisher) {
                alert('请填写完整的新书信息');
                return;
            }
        } else {
            // 已有图书从下拉列表获取
            const bookSelect = document.getElementById('existing-book-select');
            const selectedOption = bookSelect.options[bookSelect.selectedIndex];

            if (!bookSelect.value) {
                alert('请选择一本图书');
                return;
            }

            detail.is_new_book = false;
            detail.book_id = parseInt(bookSelect.value);
            detail.title = selectedOption.getAttribute('data-title');
            detail.isbn = selectedOption.getAttribute('data-isbn');
            detail.author = selectedOption.getAttribute('data-author');
            detail.publisher = selectedOption.getAttribute('data-publisher');
        }

        // 添加到明细列表
        this.currentOrderDetails.push(detail);

        // 更新明细表格
        this.updateDetailItemsTable();

        // 重置明细输入表单
        document.getElementById('detail-quantity').value = '1';
        document.getElementById('detail-purchase-price').value = '';
        document.getElementById('new-book-isbn').value = '';
        document.getElementById('new-book-title').value = '';
        document.getElementById('new-book-author').value = '';
        document.getElementById('new-book-publisher').value = '';
    },

    // 移除明细项
    removeDetailItem(index) {
        this.currentOrderDetails.splice(index, 1);
        this.updateDetailItemsTable();
    },

    // 切换新书/已有图书输入表单
    toggleBookInputForm() {
        const isNewBook = document.getElementById('is-new-book').checked;

        if (isNewBook) {
            document.getElementById('existing-book-form').style.display = 'none';
            document.getElementById('new-book-form').style.display = 'block';
        } else {
            document.getElementById('existing-book-form').style.display = 'block';
            document.getElementById('new-book-form').style.display = 'none';
        }
    },

    // 保存进货单
    async savePurchaseOrder() {
        if (this.currentOrderDetails.length === 0) {
            alert('请至少添加一项进货明细');
            return;
        }

        const orderId = document.getElementById('purchase-order-id').value;
        const orderData = {
            remark: document.getElementById('purchase-remark').value,
            details: this.currentOrderDetails
        };

        try {
            if (orderId) {
                // 编辑现有进货单
                await API.purchase.updatePurchase(orderId, orderData);
                alert('进货单更新成功');
            } else {
                // 创建新进货单
                await API.purchase.createPurchase(orderData);
                alert('进货单创建成功');
            }

            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('purchaseOrderModal')).hide();

            // 重新加载进货单列表
            this.loadOrders();
        } catch (error) {
            alert('保存进货单失败: ' + error.message);
        }
    },

    // 显示进货单详情
    async showOrderDetails(orderId) {
        try {
            const response = await API.purchase.getPurchase(orderId);
            const order = response.order;

            document.getElementById('order-detail-id').textContent = order.order_id;
            document.getElementById('order-detail-creator').textContent = order.creator_name;
            document.getElementById('order-detail-time').textContent = UI.formatDate(order.create_time);
            document.getElementById('order-detail-status').textContent = order.status;
            document.getElementById('order-detail-amount').textContent = UI.formatCurrency(order.total_amount);
            document.getElementById('order-detail-remark').textContent = order.remark || '无';

            const detailsTableBody = document.getElementById('order-details-table-body');
            detailsTableBody.innerHTML = '';

            if (order.details.length > 0) {
                order.details.forEach(detail => {
                    detailsTableBody.innerHTML += `
                        <tr>
                            <td>${detail.is_new_book ? '新书' : '已有图书'}</td>
                            <td>${detail.title}</td>
                            <td>${detail.author}</td>
                            <td>${detail.publisher}</td>
                            <td>${detail.isbn}</td>
                            <td>${detail.quantity}</td>
                            <td>${UI.formatCurrency(detail.purchase_price)}</td>
                            <td>${UI.formatCurrency(detail.quantity * detail.purchase_price)}</td>
                            ${order.status === '已付款' && detail.is_new_book ? `
                            <td>
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="PurchaseManagement.openAddToStockDialog(${detail.detail_id})">
                                    添加到库存
                                </button>
                            </td>
                            ` : '<td>-</td>'}
                        </tr>
                    `;
                });
            } else {
                detailsTableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center">无进货明细</td>
                    </tr>
                `;
            }

            // 显示模态框
            const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
            modal.show();
        } catch (error) {
            console.error('获取进货单详情失败:', error);
            alert('获取进货单详情失败: ' + error.message);
        }
    },

    // 支付进货单
    async payOrder(orderId) {
        if (!confirm('确定要支付此进货单吗？支付后将更新库存并生成财务记录。')) {
            return;
        }

        try {
            await API.purchase.payPurchase(orderId);
            alert('进货单支付成功');

            // 重新加载进货单列表
            this.loadOrders();

            // 同时更新仪表板数据
            Dashboard.loadData();
        } catch (error) {
            alert('支付进货单失败: ' + error.message);
        }
    },    // 取消进货单
    async cancelOrder(orderId) {
        if (!confirm('确定要退货此进货单吗？此操作不可撤销。')) {
            return;
        }

        try {
            await API.purchase.cancelPurchase(orderId);
            alert('进货单已退货');

            // 重新加载进货单列表
            this.loadOrders();
        } catch (error) {
            alert('退货失败: ' + error.message);
        }
    },

    // 打开添加新书到库存对话框
    openAddToStockDialog(detailId) {
        document.getElementById('add-to-stock-detail-id').value = detailId;

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('addToStockModal'));
        modal.show();
    },

    // 添加新书到库存
    async addNewBookToStock() {
        const detailId = document.getElementById('add-to-stock-detail-id').value;
        const retailPrice = parseFloat(document.getElementById('new-book-retail-price').value);

        if (!retailPrice || retailPrice <= 0) {
            alert('请输入有效的零售价格');
            return;
        }

        try {
            await API.purchase.addNewBookToStock(detailId, retailPrice);
            alert('新书已成功添加到库存');

            // 关闭模态框
            bootstrap.Modal.getInstance(document.getElementById('addToStockModal')).hide();

            // 关闭详情模态框
            bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();

            // 重新加载进货单列表和图书列表
            this.loadOrders();
            this.loadBooks();

            // 更新仪表板数据
            Dashboard.loadData();
        } catch (error) {
            alert('添加新书到库存失败: ' + error.message);
        }
    },

    // 显示添加新书对话框
    showAddNewBooksDialog(orderId) {
        try {
            const order = this.orders.find(o => o.order_id === orderId);
            if (!order) return;

            const newBookDetails = order.details.filter(d => d.is_new_book);

            const tableBody = document.getElementById('new-books-table-body');
            tableBody.innerHTML = '';

            if (newBookDetails.length > 0) {
                newBookDetails.forEach(detail => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${detail.title}</td>
                            <td>${detail.author}</td>
                            <td>${detail.publisher}</td>
                            <td>${detail.isbn}</td>
                            <td>${detail.quantity}</td>
                            <td>${UI.formatCurrency(detail.purchase_price)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="PurchaseManagement.openAddToStockDialog(${detail.detail_id})">
                                    添加到库存
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">该进货单中没有新书</td>
                    </tr>
                `;
            }

            // 显示模态框
            const modal = new bootstrap.Modal(document.getElementById('newBooksModal'));
            modal.show();
        } catch (error) {
            console.error('显示新书列表失败:', error);
            alert('显示新书列表失败: ' + error.message);
        }
    },    // 从仪表盘快速创建进货单
    quickCreatePurchase(bookId) {
        try {
            // 确保先初始化进货管理模块
            if (!this.eventsBound) {
                this.bindEvents();
                this.eventsBound = true;
                this.loadBooks().catch(() => {
                    // 静默处理错误
                });
            }

            // 切换到进货管理页面
            UI.showPage('purchase-management');

            // 给系统一点时间来加载页面和数据
            setTimeout(() => {
                // 打开创建进货单对话框
                this.openCreateOrderDialog();

                // 再等待一段时间，确保对话框已打开且图书列表加载完成
                setTimeout(() => {
                    // 确保已经选择"已有图书"（不是新书）
                    const isNewBookCheckbox = document.getElementById('is-new-book');
                    if (isNewBookCheckbox && isNewBookCheckbox.checked) {
                        isNewBookCheckbox.checked = false;
                        isNewBookCheckbox.dispatchEvent(new Event('change'));
                    }

                    // 操作图书选择下拉框
                    const bookSelect = document.getElementById('existing-book-select');
                    if (bookSelect) {
                        // 设置所选图书
                        bookSelect.value = bookId;

                        // 触发图书选择变更事件
                        bookSelect.dispatchEvent(new Event('change'));

                        // 设置默认数量为10
                        document.getElementById('detail-quantity').value = 10;

                        // 添加到明细
                        const addBtn = document.getElementById('add-detail-item-btn');
                        if (addBtn) {
                            addBtn.click();
                        }
                    }
                }, 300);
            }, 500);
        } catch (error) {
            alert('快速创建进货单失败');
        }
    }
};