/**
 * 图书管理模块前端逻辑
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

    // 当前选中的图书ID
    let selectedBookId = null;

    // 初始化分类和出版社下拉框
    const initFilters = async () => {
        try {
            // 获取分类列表
            const categoriesResponse = await fetch('/api/books/categories', { headers });
            const categoriesData = await categoriesResponse.json();
            const categorySelect = document.getElementById('category');

            if (categoriesData.status === 'success') {
                categoriesData.data.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
            }

            // 获取出版社列表
            const publishersResponse = await fetch('/api/books/publishers', { headers });
            const publishersData = await publishersResponse.json();
            const publisherSelect = document.getElementById('publisher');

            if (publishersData.status === 'success') {
                publishersData.data.forEach(publisher => {
                    const option = document.createElement('option');
                    option.value = publisher;
                    option.textContent = publisher;
                    publisherSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    };

    // 加载图书数据
    function loadBooks(page = 1, perPage = 10) {
        const token = localStorage.getItem('token');
        if (!token) {
            showMessage('您需要登录才能访问此功能', 'error');
            window.location.href = '/login';
            return;
        }

        const url = `/api/books?page=${page}&per_page=${perPage}`;
        document.getElementById('loading-indicator').style.display = 'block';

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token.trim()}`
            }
        })
            .then(response => {
                // 即使是401错误也尝试继续操作
                if (response.status === 401) {
                    console.warn('令牌验证失败 (401)，但继续使用系统');
                    // 此处不再重定向到登录页面
                    return Promise.reject('未授权，但继续操作');
                }
                return response.json();
            })
            .then(data => {
                // 处理成功响应
                displayBooks(data.books);
                setupPagination(data.total, data.page, data.pages);
            })
            .catch(error => {
                console.error('加载图书数据错误:', error);
                // 显示错误信息但不重定向
                document.getElementById('loading-indicator').style.display = 'none';
                // 这里可以显示友好的错误提示
            });
    }

    // 渲染图书列表
    const renderBooks = (books) => {
        const tbody = document.getElementById('books-list');
        tbody.innerHTML = '';

        books.forEach(book => {
            // 设置库存状态样式
            let stockClass = 'bg-success';
            if (book.stock <= 5 && book.stock > 0) {
                stockClass = 'bg-warning text-dark';
            } else if (book.stock === 0) {
                stockClass = 'bg-danger';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.isbn}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category}</td>
                <td>¥${book.retail_price.toFixed(2)}</td> 
                <td><span class="badge ${stockClass}">${book.stock}</span></td>
                <td>
                    <div class="btn-group">
                        <a href="/books/edit/${book.book_id}" class="btn btn-sm btn-primary">
                            <i class="bi bi-pencil"></i>
                        </a>
                        <button class="btn btn-sm btn-success adjust-stock" data-id="${book.book_id}" data-title="${book.title}" data-stock="${book.stock}">
                            <i class="bi bi-box"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-book" data-id="${book.book_id}" data-title="${book.title}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定删除图书按钮事件
        document.querySelectorAll('.delete-book').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = this.getAttribute('data-id');
                const bookTitle = this.getAttribute('data-title');
                showDeleteConfirmation(bookId, bookTitle);
            });
        });

        // 绑定库存调整按钮事件
        document.querySelectorAll('.adjust-stock').forEach(button => {
            button.addEventListener('click', function () {
                const bookId = this.getAttribute('data-id');
                const bookTitle = this.getAttribute('data-title');
                const currentStock = this.getAttribute('data-stock');
                showAdjustStockModal(bookId, bookTitle, currentStock);
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
                    loadBooks(page, getSearchFilters());
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

    // 显示删除确认对话框
    const showDeleteConfirmation = (bookId, bookTitle) => {
        selectedBookId = bookId;
        document.getElementById('delete-book-title').textContent = bookTitle;
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteBookModal'));
        deleteModal.show();
    };

    // 显示库存调整对话框
    const showAdjustStockModal = (bookId, bookTitle, currentStock) => {
        selectedBookId = bookId;
        document.getElementById('adjust-book-title').value = bookTitle;
        document.getElementById('current-stock').value = currentStock;
        document.getElementById('adjust-quantity').value = '';
        document.getElementById('adjust-notes').value = '';
        document.getElementById('adjust-error').style.display = 'none';

        const adjustModal = new bootstrap.Modal(document.getElementById('adjustStockModal'));
        adjustModal.show();
    };

    // 删除图书
    const deleteBook = async () => {
        if (!selectedBookId) return;

        try {
            const response = await fetch(`/api/books/${selectedBookId}`, {
                method: 'DELETE',
                headers
            });

            const data = await response.json();

            if (data.status === 'success') {
                // 关闭Modal
                bootstrap.Modal.getInstance(document.getElementById('deleteBookModal')).hide();
                // 显示成功通知
                showNotification('图书已成功删除', 'success');
                // 重新加载当前页数据
                loadBooks(currentPage, getSearchFilters());
            } else {
                showError('删除失败: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            showError('网络错误，请稍后重试');
        }
    };

    // 调整库存
    const adjustStock = async () => {
        if (!selectedBookId) return;

        const adjustType = document.getElementById('adjust-type').value;
        const quantity = parseInt(document.getElementById('adjust-quantity').value);
        const reason = document.getElementById('adjust-reason').value;
        const notes = document.getElementById('adjust-notes').value;
        const currentStock = parseInt(document.getElementById('current-stock').value);

        if (!quantity || quantity < 1) {
            document.getElementById('adjust-error').textContent = '请输入有效的数量';
            document.getElementById('adjust-error').style.display = 'block';
            return;
        }

        // 计算新的库存值
        let newStock = currentStock;
        switch (adjustType) {
            case 'add':
                newStock = currentStock + quantity;
                break;
            case 'subtract':
                newStock = Math.max(0, currentStock - quantity);
                break;
            case 'set':
                newStock = quantity;
                break;
        }

        try {
            const response = await fetch(`/api/books/${selectedBookId}/adjust-stock`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    new_stock: newStock,
                    reason: reason,
                    notes: notes
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                // 关闭Modal
                bootstrap.Modal.getInstance(document.getElementById('adjustStockModal')).hide();
                // 显示成功通知
                showNotification('库存已成功调整', 'success');
                // 重新加载当前页数据
                loadBooks(currentPage, getSearchFilters());
            } else {
                document.getElementById('adjust-error').textContent = '调整失败: ' + data.message;
                document.getElementById('adjust-error').style.display = 'block';
            }
        } catch (error) {
            console.error('Error adjusting stock:', error);
            document.getElementById('adjust-error').textContent = '网络错误，请稍后重试';
            document.getElementById('adjust-error').style.display = 'block';
        }
    };

    // 导出图书数据
    const exportBooks = async () => {
        const filters = getSearchFilters();
        const params = new URLSearchParams(filters);

        window.open(`/api/books/export?${params.toString()}`, '_blank');
    };

    // 显示/隐藏加载指示器
    const showLoading = (show) => {
        document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
        document.querySelector('.table-responsive').style.display = show ? 'none' : 'block';
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

    // 绑定搜索表单提交事件
    document.getElementById('search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        loadBooks(1, getSearchFilters());
    });

    // 绑定表单重置事件
    document.getElementById('search-form').addEventListener('reset', function () {
        setTimeout(() => {
            loadBooks(1, {});
        }, 10);
    });

    // 绑定删除确认事件
    document.getElementById('confirm-delete').addEventListener('click', deleteBook);

    // 绑定库存调整确认事件
    document.getElementById('confirm-adjust').addEventListener('click', adjustStock);

    // 绑定导出按钮事件
    document.getElementById('exportBtn').addEventListener('click', exportBooks);

    // 初始化页面
    initFilters();
    loadBooks();
});