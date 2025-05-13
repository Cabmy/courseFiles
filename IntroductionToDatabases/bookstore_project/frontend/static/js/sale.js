/**
 * 销售管理模块前端逻辑
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

    // 购物车数据
    let cart = [];
    // 当前选中的图书ID（用于调整数量模态框）
    let selectedBookId = null;
    // 搜索结果缓存
    let searchResults = [];

    // 搜索图书
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
            // 设置库存状态样式
            let stockClass = 'bg-success';
            let addButtonDisabled = '';

            if (book.stock <= 5 && book.stock > 0) {
                stockClass = 'bg-warning text-dark';
            } else if (book.stock === 0) {
                stockClass = 'bg-danger';
                addButtonDisabled = 'disabled';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.isbn}</td>
                <td>${book.title}</td>
                <td><span class="badge ${stockClass}">${book.stock}</span></td>
                <td>¥${book.retail_price.toFixed(2)}</td> 
                <td>
                    <button class="btn btn-sm btn-primary add-to-cart" data-id="${book.book_id}" ${addButtonDisabled}>
                        <i class="bi bi-plus-circle"></i> 添加
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定添加到购物车按钮事件
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = this.getAttribute('data-id');
                const book = searchResults.find(b => b.book_id === parseInt(bookId));
                addToCart(book);
            });
        });
    };

    // 添加图书到购物车
    const addToCart = (book) => {
        // 检查库存
        if (book.stock <= 0) {
            showError('该图书已无库存');
            return;
        }

        // 检查是否已经在购物车中
        const existingItem = cart.find(item => item.book_id === book.book_id);

        if (existingItem) {
            // 弹出调整数量对话框
            showAdjustQuantityModal(book, existingItem);
        } else {
            // 添加新项目到购物车
            const cartItem = {
                book_id: book.book_id,
                title: book.title,
                sale_price: book.retail_price, // 使用 retail_price 初始化 sale_price
                quantity: 1,
                max_stock: book.stock,
                isbn: book.isbn
            };

            cart.push(cartItem);
            updateCartUI();
        }
    };

    // 显示调整数量对话框
    const showAdjustQuantityModal = (book, existingItem = null) => {
        selectedBookId = book.book_id;

        document.getElementById('book-title-display').value = book.title;
        document.getElementById('stock-display').value = book.stock;

        // 如果是已有项目，显示当前的价格和数量
        if (existingItem) {
            document.getElementById('adjust-price').value = existingItem.sale_price; // 使用 sale_price
            document.getElementById('adjust-quantity').value = existingItem.quantity;
        } else {
            document.getElementById('adjust-price').value = book.retail_price; // 使用 retail_price
            document.getElementById('adjust-quantity').value = 1;
        }

        // 设置数量的最大值
        document.getElementById('adjust-quantity').setAttribute('max', book.stock);

        // 清除错误提示
        document.getElementById('adjust-error').style.display = 'none';

        // 显示Modal
        const adjustModal = new bootstrap.Modal(document.getElementById('adjustQuantityModal'));
        adjustModal.show();
    };

    // 确认调整数量
    const confirmAdjustQuantity = () => {
        const price = parseFloat(document.getElementById('adjust-price').value); // 此处 price 实际上是 sale_price
        const quantity = parseInt(document.getElementById('adjust-quantity').value);
        const maxStock = parseInt(document.getElementById('stock-display').value);
        const errorElement = document.getElementById('adjust-error');

        // 验证输入
        if (!price || price <= 0) {
            errorElement.textContent = '请输入有效的价格';
            errorElement.style.display = 'block';
            return;
        }

        if (!quantity || quantity <= 0) {
            errorElement.textContent = '请输入有效的数量';
            errorElement.style.display = 'block';
            return;
        }

        if (quantity > maxStock) {
            errorElement.textContent = '数量不能超过当前库存';
            errorElement.style.display = 'block';
            return;
        }

        // 更新购物车
        const bookIndex = cart.findIndex(item => item.book_id === selectedBookId);

        if (bookIndex !== -1) {
            // 更新现有项目
            cart[bookIndex].quantity = quantity;
            cart[bookIndex].sale_price = price; // 更新 sale_price
        } else {
            // 添加新项目
            const book = searchResults.find(b => b.book_id === selectedBookId);
            const cartItem = {
                book_id: book.book_id,
                title: book.title,
                sale_price: price, // 设置 sale_price
                quantity: quantity,
                max_stock: book.stock,
                isbn: book.isbn
            };
            cart.push(cartItem);
        }

        // 关闭Modal
        bootstrap.Modal.getInstance(document.getElementById('adjustQuantityModal')).hide();

        // 更新UI
        updateCartUI();
    };

    // 从购物车中移除项目
    const removeFromCart = (bookId) => {
        cart = cart.filter(item => item.book_id !== bookId);
        updateCartUI();
    };

    // 清空购物车
    const clearCart = () => {
        cart = [];
        updateCartUI();
    };

    // 更新购物车UI
    const updateCartUI = () => {
        const tbody = document.getElementById('cart-items');
        const totalElement = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('checkout-btn');
        const clearCartBtn = document.getElementById('clear-cart-btn');

        if (cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">购物车为空</td></tr>';
            totalElement.textContent = '¥0.00';
            checkoutBtn.disabled = true;
            clearCartBtn.disabled = true;
            return;
        }

        tbody.innerHTML = '';
        let total = 0;

        cart.forEach(item => {
            const subtotal = item.sale_price * item.quantity; // 使用 sale_price
            total += subtotal;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.title}</td>
                <td>¥${item.sale_price.toFixed(2)}</td> 
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
        checkoutBtn.disabled = false;
        clearCartBtn.disabled = false;

        // 绑定编辑和删除按钮事件
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = parseInt(this.getAttribute('data-id'));
                const item = cart.find(item => item.book_id === bookId);
                const book = searchResults.find(b => b.book_id === bookId) || {
                    book_id: item.book_id,
                    title: item.title,
                    price: item.sale_price,
                    stock: item.max_stock
                };
                showAdjustQuantityModal(book, item);
            });
        });

        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = parseInt(this.getAttribute('data-id'));
                if (confirm('确定要从购物车中移除此项吗？')) {
                    removeFromCart(bookId);
                }
            });
        });
    };

    // 完成销售
    const completeSale = async () => {
        if (cart.length === 0) {
            showError('购物车为空，无法完成销售');
            return;
        }

        const customerName = document.getElementById('customer-name').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const notes = document.getElementById('sale-notes').value;

        // 构建销售数据
        const saleData = {
            items: cart.map(item => ({
                book_id: item.book_id,
                quantity: item.quantity,
                sale_price: item.sale_price // 发送 sale_price
            })),
            customer_name: customerName,
            customer_phone: customerPhone,
            notes: notes
        };

        try {
            const response = await fetch('/api/sales/add', {
                method: 'POST',
                headers,
                body: JSON.stringify(saleData)
            });

            const data = await response.json();

            if (data.status === 'success') {
                // 显示销售完成对话框
                const total = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
                document.getElementById('final-amount').textContent = `¥${total.toFixed(2)}`;
                document.getElementById('sale-time').textContent = new Date().toLocaleString();

                const completeModal = new bootstrap.Modal(document.getElementById('saleCompleteModal'));
                completeModal.show();

                // 清空购物车和表单
                clearCart();
                document.getElementById('customer-name').value = '';
                document.getElementById('customer-phone').value = '';
                document.getElementById('sale-notes').value = '';
            } else {
                showError('销售失败: ' + data.message);
            }
        } catch (error) {
            console.error('Error completing sale:', error);
            showError('网络错误，请稍后重试');
        }
    };

    // 显示/隐藏搜索加载指示器
    const showSearchLoading = (show) => {
        document.getElementById('search-loading').style.display = show ? 'block' : 'none';
        document.getElementById('search-results-table').style.display = show ? 'none' : 'table';
    };

    // 显示错误信息
    const showError = (message) => {
        // 可以使用toast或者其他方式展示错误
        alert(message);
    };

    // 绑定搜索表单提交事件
    document.getElementById('book-search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const query = document.getElementById('book-search').value.trim();

        if (query) {
            searchBooks(query);
        }
    });

    // 绑定调整数量确认按钮事件
    document.getElementById('confirm-adjust').addEventListener('click', confirmAdjustQuantity);

    // 绑定完成销售按钮事件
    document.getElementById('checkout-btn').addEventListener('click', completeSale);

    // 绑定清空购物车按钮事件
    document.getElementById('clear-cart-btn').addEventListener('click', function () {
        if (confirm('确定要清空购物车吗？')) {
            clearCart();
        }
    });

    // 绑定继续添加销售按钮事件
    document.getElementById('new-sale-btn').addEventListener('click', function () {
        bootstrap.Modal.getInstance(document.getElementById('saleCompleteModal')).hide();
        document.getElementById('book-search').value = '';
        document.getElementById('book-search').focus();
    });

    // 初始化页面
    updateCartUI();
});