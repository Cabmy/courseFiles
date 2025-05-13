/**
 * 财务管理模块前端逻辑
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

    // 初始化日期选择器默认值为当月
    const initDateFilters = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // 格式化为YYYY-MM-DD
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        document.getElementById('date-from').value = formatDate(firstDay);
        document.getElementById('date-to').value = formatDate(lastDay);
    };

    // 加载财务记录数据
    const loadFinancialRecords = async (page = 1, filters = {}) => {
        showLoading(true);

        try {
            // 构建查询参数
            const params = new URLSearchParams({
                page,
                per_page: perPage,
                ...filters
            });

            // 排序参数处理
            if (filters.sort) {
                const [field, direction] = filters.sort.split(':');
                params.set('sort_by', field);
                params.set('sort_direction', direction);
                params.delete('sort');
            }

            const response = await fetch(`/api/financial/records?${params.toString()}`, { headers });
            const data = await response.json();

            if (data.status === 'success') {
                renderRecords(data.data.items);
                renderPagination(data.data.meta.total, page);
                loadSummary(filters);
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
                showError('加载财务记录失败: ' + data.message);
            }
        } catch (error) {
            console.error('Error fetching financial records:', error);
            showError('网络错误，请稍后重试');
        } finally {
            showLoading(false);
        }
    };

    // 加载财务摘要数据
    const loadSummary = async (filters = {}) => {
        try {
            // 构建查询参数
            const params = new URLSearchParams(filters);

            const response = await fetch(`/api/financial/summary?${params.toString()}`, { headers });
            const data = await response.json();

            if (data.status === 'success') {
                document.getElementById('total-income').textContent = `¥${data.data.income.toFixed(2)}`;
                document.getElementById('total-expense').textContent = `¥${data.data.expense.toFixed(2)}`;

                const netProfit = data.data.income - data.data.expense;
                const netProfitElement = document.getElementById('net-profit');
                netProfitElement.textContent = `¥${Math.abs(netProfit).toFixed(2)}`;

                // 根据净利润为正负设置不同颜色
                if (netProfit >= 0) {
                    netProfitElement.classList.remove('text-danger');
                    netProfitElement.classList.add('text-success');
                } else {
                    netProfitElement.classList.remove('text-success');
                    netProfitElement.classList.add('text-danger');
                }
            } else {
                console.error('加载财务摘要失败:', data.message);
            }
        } catch (error) {
            console.error('Error fetching financial summary:', error);
        }
    };

    // 渲染财务记录表格
    const renderRecords = (records) => {
        const tbody = document.getElementById('financial-records');
        tbody.innerHTML = '';

        records.forEach(record => {
            // 设置记录类型样式
            const typeClass = record.type === '收入' ? 'text-success' : 'text-danger';
            const amountPrefix = record.type === '收入' ? '+' : '-';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(record.created_at).toLocaleDateString()}</td>
                <td><span class="${typeClass}">${record.type}</span></td>
                <td>${record.category}</td>
                <td class="${typeClass}">${amountPrefix}¥${record.amount.toFixed(2)}</td>
                <td>${record.reference_id || '-'}</td>
                <td>${record.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info view-details" data-id="${record.record_id}">
                        <i class="bi bi-eye"></i> 详情
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 绑定查看详情按钮事件
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function () {
                const recordId = this.getAttribute('data-id');
                loadRecordDetails(recordId);
            });
        });
    };

    // 渲染分页
    const renderPagination = (total, currentPage) => {
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
                    loadFinancialRecords(page, getFilterValues());
                }
            });
        });
    };

    // 获取筛选表单中的值
    const getFilterValues = () => {
        const filters = {};
        const form = document.getElementById('filter-form');
        const formData = new FormData(form);

        for (const [key, value] of formData.entries()) {
            if (value && value.trim() !== '') {
                filters[key] = value;
            }
        }

        return filters;
    };

    // 加载财务记录详情
    const loadRecordDetails = async (recordId) => {
        try {
            const response = await fetch(`/api/financial/records/${recordId}`, { headers });
            const data = await response.json();

            if (data.status === 'success') {
                const record = data.data;

                // 设置基本信息
                document.getElementById('detail-id').textContent = record.record_id;
                document.getElementById('detail-datetime').textContent = new Date(record.created_at).toLocaleString();
                document.getElementById('detail-type').textContent = record.type;
                document.getElementById('detail-category').textContent = record.category;

                const amountPrefix = record.type === '收入' ? '+' : '-';
                document.getElementById('detail-amount').textContent = `${amountPrefix}¥${record.amount.toFixed(2)}`;
                document.getElementById('detail-amount').className = record.type === '收入' ? 'text-success' : 'text-danger';

                document.getElementById('detail-reference').textContent = record.reference_id || '-';
                document.getElementById('detail-operator').textContent = record.operator_name || '-';
                document.getElementById('detail-notes').textContent = record.notes || '-';

                // 渲染明细项目
                const itemsBody = document.getElementById('detail-items');

                if (record.items && record.items.length > 0) {
                    itemsBody.innerHTML = '';
                    let total = 0;

                    record.items.forEach(item => {
                        const subtotal = item.quantity * item.price;
                        total += subtotal;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.name || item.book_title || '未知项目'}</td>
                            <td>${item.quantity}</td>
                            <td>¥${item.price.toFixed(2)}</td>
                            <td>¥${subtotal.toFixed(2)}</td>
                        `;
                        itemsBody.appendChild(row);
                    });

                    document.getElementById('detail-total').textContent = `¥${total.toFixed(2)}`;
                } else {
                    itemsBody.innerHTML = '<tr><td colspan="4" class="text-center">无明细数据</td></tr>';
                    document.getElementById('detail-total').textContent = `¥${record.amount.toFixed(2)}`;
                }

                // 显示Modal
                const detailModal = new bootstrap.Modal(document.getElementById('recordDetailModal'));
                detailModal.show();
            } else {
                showError('加载详情失败: ' + data.message);
            }
        } catch (error) {
            console.error('Error fetching record details:', error);
            showError('网络错误，请稍后重试');
        }
    };

    // 导出财务记录
    const exportRecords = () => {
        const filters = getFilterValues();
        const params = new URLSearchParams(filters);

        window.open(`/api/financial/export?${params.toString()}`, '_blank');
    };

    // 打印财务记录
    const printRecords = () => {
        window.print();
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

    // 绑定筛选表单提交事件
    document.getElementById('filter-form').addEventListener('submit', function (e) {
        e.preventDefault();
        loadFinancialRecords(1, getFilterValues());
    });

    // 绑定表单重置事件
    document.getElementById('filter-form').addEventListener('reset', function () {
        setTimeout(() => {
            initDateFilters(); // 重设日期为当月
            loadFinancialRecords(1, getFilterValues());
        }, 10);
    });

    // 绑定导出按钮事件
    document.getElementById('export-btn').addEventListener('click', exportRecords);

    // 绑定打印按钮事件
    document.getElementById('print-btn').addEventListener('click', printRecords);

    // 初始化页面
    initDateFilters();
    loadFinancialRecords(1, getFilterValues());
});