// 财务管理功能模块
const FinanceManagement = {
    // 是否已初始化事件
    eventsBound: false,

    // 初始化
    init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        this.loadFinancialSummary();
        this.loadFinancialRecords();
        this.loadMonthlyStatistics();
    },

    // 绑定事件
    bindEvents() {
        // 筛选记录事件
        document.getElementById('finance-search-btn').addEventListener('click', () => {
            this.loadFinancialRecords();
        });

        // 年份选择事件
        document.getElementById('year-select').addEventListener('change', () => {
            this.loadMonthlyStatistics();
        });

        // 日期筛选变更事件
        document.getElementById('finance-start-date').addEventListener('change', () => {
            this.loadFinancialRecords();
        });

        document.getElementById('finance-end-date').addEventListener('change', () => {
            this.loadFinancialRecords();
        });

        // 类型筛选变更事件
        document.getElementById('finance-type-filter').addEventListener('change', () => {
            this.loadFinancialRecords();
        });
    },

    // 加载财务概览信息
    async loadFinancialSummary() {
        try {
            const response = await API.finance.getFinanceSummary();
            const summary = response.summary;

            // 更新总体概览
            document.getElementById('total-income').textContent = UI.formatCurrency(summary.total_income);
            document.getElementById('total-expense').textContent = UI.formatCurrency(summary.total_expense);
            document.getElementById('total-profit').textContent = UI.formatCurrency(summary.total_profit);

            // 更新本月概览
            document.getElementById('current-month-label').textContent = `${summary.current_month.year}年${summary.current_month.month}月`;
            document.getElementById('current-month-income').textContent = UI.formatCurrency(summary.current_month.income);
            document.getElementById('current-month-expense').textContent = UI.formatCurrency(summary.current_month.expense);
            document.getElementById('current-month-profit').textContent = UI.formatCurrency(summary.current_month.profit);

            // 更新上月概览
            document.getElementById('last-month-label').textContent = `${summary.last_month.year}年${summary.last_month.month}月`;
            document.getElementById('last-month-income').textContent = UI.formatCurrency(summary.last_month.income);
            document.getElementById('last-month-expense').textContent = UI.formatCurrency(summary.last_month.expense);
            document.getElementById('last-month-profit').textContent = UI.formatCurrency(summary.last_month.profit);

            // 计算环比增长率
            if (summary.last_month.profit !== 0) {
                const growthRate = (summary.current_month.profit - summary.last_month.profit) / Math.abs(summary.last_month.profit) * 100;
                const growthElement = document.getElementById('month-over-month');
                growthElement.textContent = growthRate.toFixed(2) + '%';

                if (growthRate > 0) {
                    growthElement.classList.add('text-success');
                    growthElement.classList.remove('text-danger');
                    growthElement.innerHTML = `<i class="bi bi-arrow-up"></i> ${growthRate.toFixed(2)}%`;
                } else if (growthRate < 0) {
                    growthElement.classList.add('text-danger');
                    growthElement.classList.remove('text-success');
                    growthElement.innerHTML = `<i class="bi bi-arrow-down"></i> ${Math.abs(growthRate).toFixed(2)}%`;
                } else {
                    growthElement.classList.remove('text-success', 'text-danger');
                    growthElement.textContent = '0%';
                }
            } else {
                document.getElementById('month-over-month').textContent = '-';
            }
        } catch (error) {
            console.error('加载财务概览失败:', error);
            alert('加载财务概览失败: ' + error.message);
        }
    },

    // 加载财务记录列表
    async loadFinancialRecords() {
        UI.showLoading('finance-records-table-body');

        try {
            // 获取筛选条件
            const startDate = document.getElementById('finance-start-date').value;
            const endDate = document.getElementById('finance-end-date').value;
            const typeFilter = document.getElementById('finance-type-filter').value;

            const params = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (typeFilter) params.type = typeFilter;

            const response = await API.finance.getAllFinancialRecords(params);
            const records = response.records;

            const tableBody = document.getElementById('finance-records-table-body');
            tableBody.innerHTML = '';

            if (records.length > 0) {
                records.forEach(record => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${record.record_id}</td>
                            <td>${record.type}</td>
                            <td>${UI.formatCurrency(record.amount)}</td>
                            <td>${record.source_type}</td>
                            <td>${record.source_id}</td>
                            <td>${UI.formatDate(record.record_time)}</td>
                            <td>${record.operator_name}</td>
                            <td>${record.description || '-'}</td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">暂无财务记录</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('加载财务记录失败:', error);
            UI.showError('finance-records-table-body', '加载财务记录失败: ' + error.message);
        }
    },

    // 加载月度统计数据
    async loadMonthlyStatistics() {
        try {
            // 获取选择的年份
            const year = document.getElementById('year-select').value || new Date().getFullYear();

            const response = await API.finance.getMonthlyStatistics(year);
            const statistics = response.monthly_statistics;

            // 按月份组织数据
            const monthlyData = {};
            statistics.forEach(item => {
                if (!monthlyData[item.month]) {
                    monthlyData[item.month] = {
                        month: item.month,
                        income: 0,
                        expense: 0,
                        profit: 0
                    };
                }

                if (item.type === '收入') {
                    monthlyData[item.month].income = item.total_amount;
                } else if (item.type === '支出') {
                    monthlyData[item.month].expense = item.total_amount;
                }

                // 计算利润
                monthlyData[item.month].profit =
                    monthlyData[item.month].income - monthlyData[item.month].expense;
            });

            // 转换为数组并排序
            const sortedData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

            // 更新表格
            const tableBody = document.getElementById('monthly-statistics-body');
            tableBody.innerHTML = '';

            if (sortedData.length > 0) {
                sortedData.forEach(item => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${item.month}</td>
                            <td>${UI.formatCurrency(item.income)}</td>
                            <td>${UI.formatCurrency(item.expense)}</td>
                            <td>${UI.formatCurrency(item.profit)}</td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">该年度暂无财务数据</td>
                    </tr>
                `;
            }

            // 生成图表
            this.generateMonthlyChart(sortedData);
        } catch (error) {
            console.error('加载月度统计失败:', error);
            UI.showError('monthly-statistics-body', '加载月度统计失败: ' + error.message);
        }
    },

    // 生成月度图表
    generateMonthlyChart(data) {
        // 获取图表容器
        const chartContainer = document.getElementById('monthly-chart');

        if (!data || data.length === 0) {
            chartContainer.innerHTML = '<p class="text-center">暂无数据可供可视化展示</p>';
            return;
        }

        // 检查Chart是否已定义
        if (typeof Chart === 'undefined') {
            console.error('Chart.js库未加载');
            chartContainer.innerHTML = '<div class="alert alert-danger">加载月度统计失败: Chart库未加载</div>';
            return;
        }

        try {
            // 先检查是否存在旧图表实例，如果有则销毁
            if (this.chartInstance) {
                this.chartInstance.destroy();
            }

            // 清空之前的图表内容
            chartContainer.innerHTML = '<canvas id="financeChart"></canvas>';

            // 准备图表数据
            const months = data.map(item => item.month.split('-')[1] + '月');
            const incomeData = data.map(item => item.income);
            const expenseData = data.map(item => item.expense);
            const profitData = data.map(item => item.profit);

            // 创建图表
            const ctx = document.getElementById('financeChart').getContext('2d');
            this.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: '收入',
                            data: incomeData,
                            backgroundColor: '#28a745',
                            borderColor: '#28a745',
                            borderWidth: 1
                        },
                        {
                            label: '支出',
                            data: expenseData,
                            backgroundColor: '#dc3545',
                            borderColor: '#dc3545',
                            borderWidth: 1
                        },
                        {
                            label: '利润',
                            data: profitData,
                            backgroundColor: '#007bff',
                            borderColor: '#007bff',
                            borderWidth: 1,
                            type: 'line'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return '¥' + value;
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += '¥' + context.parsed.y.toFixed(2);
                                    }
                                    return label;
                                }
                            }
                        },
                        legend: {
                            position: 'bottom'
                        },
                        title: {
                            display: true,
                            text: '月度财务统计图表'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('创建图表失败:', error);
            chartContainer.innerHTML = '<div class="alert alert-danger">加载月度统计失败: ' + error.message + '</div>';
        }
    },

    // 加载销售利润分析
    async loadSalesProfit() {
        try {
            const response = await API.finance.getSalesProfit();
            const profitData = response.profit_data;

            const tableBody = document.getElementById('sales-profit-body');
            tableBody.innerHTML = '';

            if (profitData.length > 0) {
                profitData.forEach(item => {
                    // 计算利润率
                    const profitMargin = item.avg_sale_price > 0 ?
                        ((item.avg_sale_price - item.avg_purchase_price) / item.avg_sale_price * 100).toFixed(2) : 0;

                    tableBody.innerHTML += `
                        <tr>
                            <td>${item.title}</td>
                            <td>${item.total_sold}</td>
                            <td>${UI.formatCurrency(item.avg_purchase_price)}</td>
                            <td>${UI.formatCurrency(item.avg_sale_price)}</td>
                            <td>${UI.formatCurrency(item.avg_profit_per_book)}</td>
                            <td>${profitMargin}%</td>
                            <td>${UI.formatCurrency(item.total_profit)}</td>
                        </tr>
                    `;
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">暂无销售利润数据</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('加载销售利润分析失败:', error);
            UI.showError('sales-profit-body', '加载销售利润分析失败: ' + error.message);
        }
    }
};