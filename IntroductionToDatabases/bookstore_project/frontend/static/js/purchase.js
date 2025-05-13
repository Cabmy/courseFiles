/**
 * 采购管理模块前端逻辑
 */

document.addEventListener('DOMContentLoaded', function () {
    // 获取token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // 设置请求头
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 当前页码和每页数量
    let currentPage = 1;
    const perPage = 10;

    // 当前选中的订单ID
    let selectedOrderId = null;

    // 新增采购订单中的图书列表
    let orderItems = [];
    // 搜索结果缓存
    let searchResults = [];

    // 加载采购订单列表
    const loadOrders = async (page = 1, filters = {}) => {
        showLoading(true);

        try {
            // 构建查询参数
            const params = new URLSearchParams({
                page: page,
                per_page: perPage,
                ...filters
            });

            const response = await fetch(`/api/purchases/orders?${params.toString()}`, { headers });
            const data = await response.json();

            if (data.status === 'success') {
                renderOrders(data.data.items);
                renderPagination(data.data.meta.total, page, perPage);
                currentPage = page;

                // 显示适当的界面元素
                if (data.data.items.length > 0) {
                    document.querySelector('.table-responsive').style.display = 'block';
                    document.getElementById('no-data-message').style.display = 'none';
                } else {
                    document.querySelector('.table-responsive').style.display = 'none';
                    document.getElementById('no-data-message').style.display = 'block';
                }
            } else {
                showError('加载采购订单失败: ' + data.message);
            }
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            showError('网络错误，请稍后重试');
        } finally {
            showLoading(false);
        }
    };

    // 渲染采购订单列表
    const renderOrders = (orders) => {
        const tbody = document.getElementById('orders-list');
        tbody.innerHTML = '';

        orders.forEach(order => {
            // 设置状态样式
            let statusClass = '';
            let statusText = order.status; // 使用后端返回的状态文本

            // 根据后端返回的状态设置样式
            if (order.status === '已付款' || order.status === '已入库') {
                statusClass = 'bg-success';
            } else if (order.status === '已退货' || order.status === '已取消') {
                statusClass = 'bg-danger';
            } else if (order.status === '部分入库') {
                statusClass = 'bg-warning text-dark';
            } else if (order.status === '未付款' || order.status === '已下单') {
                statusClass = 'bg-info';
            }

            // 格式化日期
            const orderDate = new Date(order.order_date).toLocaleDateString('zh-CN');
            const expectedDate = order.expected_date ? new Date(order.expected_date).toLocaleDateString('zh-CN') : '未指定';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.order_id}</td>
                <td>${order.supplier_name}</td>
                <td>${orderDate}</td>
                <td>${expectedDate}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>¥${order.total_amount.toFixed(2)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info view-order" data-id="${order.order_id}">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${(order.status === '未付款' || order.status === '已下单') ? `
                        <button class="btn btn-sm btn-success receive-order" data-id="${order.order_id}">
                            <i class="bi bi-box-arrow-in-down"></i>
                        </button>
                        <button class="btn btn-sm btn-danger cancel-order" data-id="${order.order_id}">
                            <i class="bi bi-x-circle"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定查看订单详情按钮事件
        document.querySelectorAll('.view-order').forEach(button => {
            button.addEventListener('click', function () {
                const orderId = this.getAttribute('data-id');
                loadOrderDetails(orderId);
            });
        });

        // 绑定入库按钮事件
        document.querySelectorAll('.receive-order').forEach(button => {
            button.addEventListener('click', function () {
                const orderId = this.getAttribute('data-id');
                showReceiveModal(orderId);
            });
        });

        // 绑定取消订单按钮事件
        document.querySelectorAll('.cancel-order').forEach(button => {
            button.addEventListener('click', function () {
                const orderId = this.getAttribute('data-id');
                showCancelConfirmation(orderId);
            });
        });
    };

    // 渲染分页
    const renderPagination = (total, currentPage, perPage) => {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

        const totalPages = Math.ceil(total / perPage);
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        // 上一页
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a>`;
        pagination.appendChild(prevLi);

        // 页码
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            pagination.appendChild(li);
        }

        // 下一页
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>`;
        pagination.appendChild(nextLi);

        // 绑定分页点击事件
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                if (!this.parentElement.classList.contains('disabled') && !this.parentElement.classList.contains('active')) {
                    const page = parseInt(this.getAttribute('data-page'));
                    loadOrders(page, getSearchFilters());
                }
            });
        });
    };

    // 获取搜索表单中的过滤条件
    const getSearchFilters = () => {
        const filters = {};
        const form = document.getElementById('search-form');
        const formData = new FormData(form);

        for (const [key, value] of formData.entries()) {
            if (value && value.trim() !== '') {
                filters[key] = value;
            }
        }

        return filters;
    };

    // 加载订单详情
    const loadOrderDetails = async (orderId) => {
        try {
            const response = await fetch(`/api/purchases/orders/${orderId}`, { headers });
            const data = await response.json();

            if (data.status === 'success') {
                renderOrderDetails(data.data);
                const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
                orderDetailModal.show();
            } else {
                showError('加载订单详情失败: ' + data.message);
            }
        } catch (error) {
            console.error('Error fetching order details:', error);
            showError('网络错误，请稍后重试');
        }
    };

    // 渲染订单详情
    const renderOrderDetails = (order) => {
        // 设置订单基本信息
        document.getElementById('detail-order-id').textContent = order.order_id;
        document.getElementById('detail-supplier').textContent = order.supplier_name;
        document.getElementById('detail-order-date').textContent = new Date(order.order_date).toLocaleDateString('zh-CN');
        document.getElementById('detail-expected-date').textContent = order.expected_date ?
            new Date(order.expected_date).toLocaleDateString('zh-CN') : '未指定';

        // 设置状态
        let statusClass = '';

        // 根据后端返回的状态设置样式
        if (order.status === '已付款' || order.status === '已入库') {
            statusClass = 'bg-success';
        } else if (order.status === '已退货' || order.status === '已取消') {
            statusClass = 'bg-danger';
        } else if (order.status === '部分入库') {
            statusClass = 'bg-warning text-dark';
        } else if (order.status === '未付款' || order.status === '已下单') {
            statusClass = 'bg-info';
        }

        document.getElementById('detail-status').className = `badge ${statusClass}`;
        document.getElementById('detail-status').textContent = order.status;

        document.getElementById('detail-total').textContent = `¥${order.total_amount.toFixed(2)}`;
        document.getElementById('detail-notes').textContent = order.notes || '无备注';

        // 渲染订单项目列表
        const tbody = document.getElementById('detail-items');
        tbody.innerHTML = '';

        order.items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.isbn || '未知'}</td>
                <td>${item.title}</td>
                <td>¥${item.purchase_price ? item.purchase_price.toFixed(2) : item.retail_price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>${item.received_quantity || 0}</td>
                <td>¥${((item.purchase_price || item.retail_price) * item.quantity).toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });

        // 显示或隐藏相关操作按钮
        const receiveBtn = document.getElementById('detail-receive-btn');
        const cancelBtn = document.getElementById('detail-cancel-btn');

        if (order.status === '未付款' || order.status === '已下单') {
            receiveBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'inline-block';

            // 绑定操作事件
            receiveBtn.onclick = () => {
                bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();
                showReceiveModal(order.order_id);
            };

            cancelBtn.onclick = () => {
                bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();
                showCancelConfirmation(order.order_id);
            };
        } else {
            receiveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }
    };

    // 显示入库模态框
    const showReceiveModal = async (orderId) => {
        selectedOrderId = orderId;

        try {
            const response = await fetch(`/api/purchases/orders/${orderId}`, { headers });
            const data = await response.json();

            if (data.status === 'success') {
                // 渲染入库表单
                renderReceiveForm(data.data);
                const receiveModal = new bootstrap.Modal(document.getElementById('receiveOrderModal'));
                receiveModal.show();
            } else {
                showError('加载订单信息失败: ' + data.message);
            }
        } catch (error) {
            console.error('Error fetching order details:', error);
            showError('网络错误，请稍后重试');
        }
    };

    // 渲染入库表单
    const renderReceiveForm = (order) => {
        document.getElementById('receive-order-id').textContent = order.order_id;
        document.getElementById('receive-supplier').textContent = order.supplier_name;

        const tbody = document.getElementById('receive-items');
        tbody.innerHTML = '';

        order.items.forEach(item => {
            const remaining = item.quantity - (item.received_quantity || 0);

            if (remaining > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.title}</td>
                    <td>${item.quantity}</td>
                    <td>${item.received_quantity || 0}</td>
                    <td>${remaining}</td>
                    <td>
                        <input type="number" class="form-control receive-quantity" 
                            data-id="${item.item_id}" 
                            data-max="${remaining}" 
                            min="0" max="${remaining}" value="${remaining}">
                    </td>
                `;
                tbody.appendChild(row);
            }
        });

        // 清除错误信息
        document.getElementById('receive-error').style.display = 'none';
    };

    // 确认入库
    const confirmReceive = async () => {
        if (!selectedOrderId) return;

        // 收集入库数据
        const receiveItems = [];
        let hasItems = false;

        document.querySelectorAll('.receive-quantity').forEach(input => {
            const itemId = input.getAttribute('data-id');
            const quantity = parseInt(input.value) || 0;

            if (quantity > 0) {
                receiveItems.push({
                    item_id: itemId,
                    quantity: quantity
                });
                hasItems = true;
            }
        });

        if (!hasItems) {
            document.getElementById('receive-error').textContent = '请至少输入一项商品的入库数量';
            document.getElementById('receive-error').style.display = 'block';
            return;
        }

        const notes = document.getElementById('receive-notes').value;

        try {
            const response = await fetch(`/api/purchases/orders/${selectedOrderId}/receive`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    items: receiveItems,
                    notes: notes
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // 关闭Modal
                bootstrap.Modal.getInstance(document.getElementById('receiveOrderModal')).hide();
                // 显示成功通知
                showNotification('订单已成功入库', 'success');
                // 重新加载当前页数据
                loadOrders(currentPage, getSearchFilters());
            } else {
                document.getElementById('receive-error').textContent = '入库失败: ' + data.message;
                document.getElementById('receive-error').style.display = 'block';
            }
        } catch (error) {
            console.error('Error receiving order:', error);
            document.getElementById('receive-error').textContent = '网络错误，请稍后重试';
            document.getElementById('receive-error').style.display = 'block';
        }
    };

    // 显示取消订单确认
    const showCancelConfirmation = (orderId) => {
        selectedOrderId = orderId;
        document.getElementById('cancel-order-id').textContent = orderId;
        const cancelModal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));
        cancelModal.show();
    };

    // 确认取消订单
    const confirmCancel = async () => {
        if (!selectedOrderId) return;

        const reason = document.getElementById('cancel-reason').value;

        try {
            const response = await fetch(`/api/purchases/orders/${selectedOrderId}/cancel`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    reason: reason
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // 关闭Modal
                bootstrap.Modal.getInstance(document.getElementById('cancelOrderModal')).hide();
                // 显示成功通知
                showNotification('订单已成功取消', 'success');
                // 重新加载当前页数据
                loadOrders(currentPage, getSearchFilters());
            } else {
                document.getElementById('cancel-error').textContent = '取消失败: ' + data.message;
                document.getElementById('cancel-error').style.display = 'block';
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            document.getElementById('cancel-error').textContent = '网络错误，请稍后重试';
            document.getElementById('cancel-error').style.display = 'block';
        }
    };

    // 新增采购订单 - 搜索图书
    const searchBooks = async (query) => {
        showSearchLoading(true);

        try {
            const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`, { headers });
            const data = await response.json();

            if (data.status === 'success') {
                searchResults = data.data;
                renderSearchResults(data.data);
            } else {
                showError('搜索图书失败: ' + data.message);
                searchResults = [];
                renderSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching books:', error);
            showError('网络错误，请稍后重试');
            searchResults = [];
            renderSearchResults([]);
        } finally {
            showSearchLoading(false);
        }
    };

    // 渲染搜索结果
    const renderSearchResults = (books) => {
        const resultsTable = document.getElementById('search-results-table');
        const tbody = document.getElementById('search-results');
        const noResultsDiv = document.getElementById('no-results');

        tbody.innerHTML = '';

        if (books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">未找到匹配的图书</td></tr>';
            noResultsDiv.style.display = 'block';
            resultsTable.style.display = 'none';
            return;
        }

        noResultsDiv.style.display = 'none';
        resultsTable.style.display = 'table';

        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.isbn}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.publisher}</td>
                <td>
                    <button class="btn btn-sm btn-primary add-to-order" data-id="${book.book_id}">
                        <i class="bi bi-plus-circle"></i> 添加
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定添加到订单按钮事件
        document.querySelectorAll('.add-to-order').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = this.getAttribute('data-id');
                const book = searchResults.find(b => b.book_id === parseInt(bookId));
                addToOrder(book);
            });
        });
    };

    // 添加图书到订单
    const addToOrder = (book) => {
        const existingItem = orderItems.find(item => item.book_id === book.book_id);
        if (existingItem) {
            showAdjustOrderItemModal(book, existingItem);
        } else {
            const orderItem = {
                book_id: book.book_id,
                title: book.title,
                author: book.author,
                publisher: book.publisher,
                purchase_price: book.retail_price || 0, // 使用 retail_price 初始化 purchase_price
                quantity: 1,
                isbn: book.isbn
            };
            orderItems.push(orderItem);
            updateOrderItemsUI();
        }
    };

    // 显示调整订单项目对话框
    const showAdjustOrderItemModal = (book, existingItem = null) => {
        document.getElementById('book-title-display').value = book.title;

        // 如果是已有项目，显示当前的价格和数量
        if (existingItem) {
            document.getElementById('adjust-price').value = existingItem.purchase_price; // 使用 purchase_price
            document.getElementById('adjust-quantity').value = existingItem.quantity;
        } else {
            document.getElementById('adjust-price').value = book.retail_price || ''; // 使用 retail_price
            document.getElementById('adjust-quantity').value = 1;
        }

        document.getElementById('adjust-error').style.display = 'none';

        // 存储当前操作的图书ID
        document.getElementById('adjustItemModal').setAttribute('data-book-id', book.book_id);

        // 显示Modal
        const adjustModal = new bootstrap.Modal(document.getElementById('adjustItemModal'));
        adjustModal.show();
    };

    // 确认调整订单项目
    const confirmAdjustOrderItem = () => {
        const bookId = parseInt(document.getElementById('adjustItemModal').getAttribute('data-book-id'));
        const price = parseFloat(document.getElementById('adjust-price').value); // 此处 price 实际上是 purchase_price
        const quantity = parseInt(document.getElementById('adjust-quantity').value);
        const errorElement = document.getElementById('adjust-error');

        // 验证输入
        if (!price || price <= 0) {
            errorElement.textContent = '请输入有效的采购价格';
            errorElement.style.display = 'block';
            return;
        }

        if (!quantity || quantity <= 0) {
            errorElement.textContent = '请输入有效的采购数量';
            errorElement.style.display = 'block';
            return;
        }

        // 更新订单项目
        const itemIndex = orderItems.findIndex(item => item.book_id === bookId);

        if (itemIndex !== -1) {
            // 更新现有项目
            orderItems[itemIndex].quantity = quantity;
            orderItems[itemIndex].purchase_price = price; // 更新 purchase_price
        } else {
            // 添加新项目
            const book = searchResults.find(b => b.book_id === bookId);
            const orderItem = {
                book_id: book.book_id,
                title: book.title,
                purchase_price: price, // 设置 purchase_price
                quantity: quantity,
                isbn: book.isbn
            };
            orderItems.push(orderItem);
        }

        // 关闭Modal
        bootstrap.Modal.getInstance(document.getElementById('adjustItemModal')).hide();

        // 更新UI
        updateOrderItemsUI();
    };

    // 从订单中移除项目
    const removeFromOrder = (bookId) => {
        orderItems = orderItems.filter(item => item.book_id !== bookId);
        updateOrderItemsUI();
    };

    // 更新订单项目UI
    const updateOrderItemsUI = () => {
        const tbody = document.getElementById('order-items');
        const totalElement = document.getElementById('order-total');
        const submitBtn = document.getElementById('submit-order-btn');

        if (orderItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">订单为空</td></tr>';
            totalElement.textContent = '¥0.00';
            submitBtn.disabled = true;
            return;
        }

        tbody.innerHTML = '';
        let total = 0;

        orderItems.forEach(item => {
            const subtotal = item.purchase_price * item.quantity; // 使用 purchase_price
            total += subtotal;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.title}</td>
                <td>¥${item.purchase_price.toFixed(2)}</td> 
                <td>${item.quantity}</td>
                <td>¥${subtotal.toFixed(2)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary edit-item" data-id="${item.book_id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger remove-item" data-id="${item.book_id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        totalElement.textContent = `¥${total.toFixed(2)}`;
        submitBtn.disabled = false;

        // 绑定编辑和删除按钮事件
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = parseInt(this.getAttribute('data-id'));
                const item = orderItems.find(item => item.book_id === bookId);
                const book = searchResults.find(b => b.book_id === bookId) || {
                    book_id: item.book_id,
                    title: item.title
                };
                showAdjustOrderItemModal(book, item);
            });
        });

        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = parseInt(this.getAttribute('data-id'));
                if (confirm('确定要从订单中移除此项吗？')) {
                    removeFromOrder(bookId);
                }
            });
        });
    };

    // 提交采购订单
    const submitOrder = async () => {
        if (orderItems.length === 0) {
            showError('订单为空，无法提交');
            return;
        }

        const supplier = document.getElementById('supplier-name').value;
        const expectedDate = document.getElementById('expected-date').value;
        const notes = document.getElementById('order-notes').value;

        if (!supplier) {
            document.getElementById('add-order-error').textContent = '请输入供应商名称';
            document.getElementById('add-order-error').style.display = 'block';
            return;
        }

        // 构建订单数据
        const orderData = {
            supplier_name: supplier,
            expected_date: expectedDate || null,
            notes: notes,
            items: orderItems.map(item => {
                // 从搜索结果中获取图书的完整信息
                const bookInfo = searchResults.find(b => b.book_id === item.book_id) || {};

                return {
                    book_id: item.book_id,
                    isbn: item.isbn,
                    title: item.title,
                    author: bookInfo.author || item.author,
                    publisher: bookInfo.publisher || item.publisher,
                    quantity: item.quantity,
                    purchase_price: item.purchase_price,
                    is_new_book: !item.book_id
                };
            })
        };

        try {
            const response = await fetch('/api/purchases/orders/add', {
                method: 'POST',
                headers,
                body: JSON.stringify(orderData)
            });

            const data = await response.json();

            if (data.status === 'success') {
                showNotification('采购订单已成功创建', 'success');
                // 跳转到订单列表页面
                window.location.href = '/purchases/list';
            } else {
                document.getElementById('add-order-error').textContent = '创建订单失败: ' + data.message;
                document.getElementById('add-order-error').style.display = 'block';
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            document.getElementById('add-order-error').textContent = '网络错误，请稍后重试';
            document.getElementById('add-order-error').style.display = 'block';
        }
    };

    // 显示/隐藏加载指示器
    const showLoading = (show) => {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }

        const tableResponsive = document.querySelector('.table-responsive');
        if (tableResponsive) {
            tableResponsive.style.display = show ? 'none' : 'block';
        }
    };

    // 显示/隐藏搜索加载指示器
    const showSearchLoading = (show) => {
        const searchLoading = document.getElementById('search-loading');
        if (searchLoading) {
            searchLoading.style.display = show ? 'block' : 'none';
        }

        const searchResultsTable = document.getElementById('search-results-table');
        if (searchResultsTable) {
            searchResultsTable.style.display = show ? 'none' : 'table';
        }
    };

    // 显示错误信息
    const showError = (message) => {
        // 可以使用toast或者其他方式展示错误
        alert(message);
    };

    // 显示通知
    const showNotification = (message, type = 'info') => {
        // 实际应用中可以使用toast或其他通知方式
        alert(message);
    };

    // 页面初始化
    const initPage = () => {
        // 判断当前页面
        const path = window.location.pathname;

        if (path.includes('/purchases/list')) {
            // 订单列表页
            loadOrders();

            // 绑定搜索表单提交事件
            const searchForm = document.getElementById('search-form');
            if (searchForm) {
                searchForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    loadOrders(1, getSearchFilters());
                });

                // 绑定表单重置事件
                searchForm.addEventListener('reset', function () {
                    setTimeout(() => {
                        loadOrders(1, {});
                    }, 10);
                });
            }

            // 绑定取消确认事件
            const confirmCancelBtn = document.getElementById('confirm-cancel');
            if (confirmCancelBtn) {
                confirmCancelBtn.addEventListener('click', confirmCancel);
            }

            // 绑定入库确认事件
            const confirmReceiveBtn = document.getElementById('confirm-receive');
            if (confirmReceiveBtn) {
                confirmReceiveBtn.addEventListener('click', confirmReceive);
            }
        } else if (path.includes('/purchases/add')) {
            // 新增订单页
            updateOrderItemsUI();

            // 绑定搜索表单提交事件
            const bookSearchForm = document.getElementById('book-search-form');
            if (bookSearchForm) {
                bookSearchForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    const query = document.getElementById('book-search').value.trim();
                    if (query) {
                        searchBooks(query);
                    }
                });
            }

            // 绑定调整数量确认按钮事件
            const confirmAdjustBtn = document.getElementById('confirm-adjust');
            if (confirmAdjustBtn) {
                confirmAdjustBtn.addEventListener('click', confirmAdjustOrderItem);
            }

            // 绑定提交订单按钮事件
            const submitOrderBtn = document.getElementById('submit-order-btn');
            if (submitOrderBtn) {
                submitOrderBtn.addEventListener('click', submitOrder);
            }
        }
    };

    // 初始化页面
    initPage();
});