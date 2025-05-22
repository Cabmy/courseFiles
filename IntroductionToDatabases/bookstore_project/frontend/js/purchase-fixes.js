// 书店进货模块综合修复脚本
document.addEventListener('DOMContentLoaded', function () {
    // 确保 PurchaseManagement 对象已经加载
    if (typeof PurchaseManagement === 'undefined') {
        return;
    }

    // ===================== 模态框管理改进 =====================

    // 保存原始方法
    const originalOpenAddToStockDialog = PurchaseManagement.openAddToStockDialog;

    // 替换原始的打开添加到库存对话框方法
    PurchaseManagement.openAddToStockDialog = function (detailId) {
        try {
            document.getElementById('add-to-stock-detail-id').value = detailId;

            // 检查是否有其他模态框正在显示
            const newBooksModal = document.getElementById('newBooksModal');
            const newBooksModalOpen = newBooksModal && newBooksModal.classList.contains('show');
            const orderDetailModal = document.getElementById('orderDetailModal');
            const orderDetailModalOpen = orderDetailModal && orderDetailModal.classList.contains('show');

            // 如果有其他模态框打开，先关闭它们
            if (newBooksModalOpen) {
                const bsNewBooksModal = bootstrap.Modal.getInstance(newBooksModal);
                if (bsNewBooksModal) {
                    bsNewBooksModal.hide();
                    setTimeout(() => this.actuallyOpenAddToStockDialog(detailId), 300);
                    return;
                }
            } else if (orderDetailModalOpen) {
                const bsOrderDetailModal = bootstrap.Modal.getInstance(orderDetailModal);
                if (bsOrderDetailModal) {
                    bsOrderDetailModal.hide();
                    setTimeout(() => this.actuallyOpenAddToStockDialog(detailId), 300);
                    return;
                }
            }

            // 如果没有其他模态框打开，直接显示
            this.actuallyOpenAddToStockDialog(detailId);
        } catch (error) {
            alert('打开添加到库存对话框失败: ' + error.message);
        }
    };

    // 添加实际打开添加到库存对话框的函数
    PurchaseManagement.actuallyOpenAddToStockDialog = function (detailId) {
        try {
            // 确保detailId被正确设置
            document.getElementById('add-to-stock-detail-id').value = detailId;

            // 清空之前可能存在的零售价
            document.getElementById('new-book-retail-price').value = '';

            // 显示模态框前先尝试检查并销毁已有实例
            const addToStockModal = document.getElementById('addToStockModal');
            const existingModal = bootstrap.Modal.getInstance(addToStockModal);

            if (existingModal) {
                existingModal.dispose();
            }

            // 创建新实例并显示
            const modal = new bootstrap.Modal(addToStockModal);
            modal.show();

            // 模态框显示后，聚焦在零售价输入框上
            addToStockModal.addEventListener('shown.bs.modal', function () {
                const priceInput = document.getElementById('new-book-retail-price');
                priceInput.value = '';
                priceInput.focus();
            }, { once: true });
        } catch (error) {
            console.error('实际打开添加到库存对话框失败:', error);
        }
    };

    // 添加对模态框隐藏事件的监听
    const addToStockModal = document.getElementById('addToStockModal');
    if (addToStockModal) {
        addToStockModal.addEventListener('hidden.bs.modal', function () {
            document.getElementById('new-book-retail-price').value = '';

            setTimeout(() => {
                const currentOrderId = document.getElementById('current-order-id').value;
                if (currentOrderId && currentOrderId.trim() !== '') {
                    API.purchase.getPurchase(currentOrderId)
                        .then(response => {
                            if (response && response.order) {
                                const newBookDetails = response.order.details.filter(d => d.is_new_book);
                                if (newBookDetails.length > 0) {
                                    PurchaseManagement.refreshNewBooksDialog(currentOrderId);
                                }
                            }
                        })
                        .catch(() => { });
                }
            }, 300);
        });
    }

    // ===================== 添加新书到库存逻辑改进 =====================

    // 保存原始方法
    const originalAddNewBookToStock = PurchaseManagement.addNewBookToStock;

    // 重写添加新书到库存方法
    PurchaseManagement.addNewBookToStock = async function () {
        const detailId = document.getElementById('add-to-stock-detail-id').value;
        const retailPrice = parseFloat(document.getElementById('new-book-retail-price').value);

        if (!retailPrice || retailPrice <= 0) {
            alert('请输入有效的零售价格');
            return;
        }

        // 保存当前状态
        const currentOrderId = document.getElementById('current-order-id').value;
        const orderDetailId = document.getElementById('order-detail-id').textContent;

        try {
            // 调用API进行添加操作
            await API.purchase.addNewBookToStock(detailId, retailPrice);

            // 先关闭当前模态框
            const addToStockModal = bootstrap.Modal.getInstance(document.getElementById('addToStockModal'));
            if (addToStockModal) {
                addToStockModal.hide();
            }

            await new Promise(resolve => setTimeout(resolve, 300));

            // 显示成功消息
            alert('新书已成功添加到库存');

            // 重新加载数据
            this.loadOrders();
            this.loadBooks();
            Dashboard.loadData();

            // 获取最新的订单数据，检查是否还有新书需要添加到库存
            if (currentOrderId && currentOrderId.trim() !== '') {
                try {
                    const response = await API.purchase.getPurchase(currentOrderId);
                    const order = response.order;

                    if (order) {
                        const newBookDetails = order.details.filter(d => d.is_new_book);
                        if (newBookDetails.length > 0) {
                            setTimeout(() => {
                                this.refreshNewBooksDialog(currentOrderId);
                            }, 300);
                        } else if (orderDetailId && orderDetailId.trim() !== '') {
                            setTimeout(() => {
                                this.showOrderDetails(orderDetailId);
                            }, 300);
                        }
                    }
                } catch (error) { }
            } else if (orderDetailId && orderDetailId.trim() !== '') {
                setTimeout(() => {
                    this.showOrderDetails(orderDetailId);
                }, 300);
            }
        } catch (error) {
            alert('添加新书到库存失败: ' + error.message);
        }
    };

    // ===================== 新书对话框管理改进 =====================

    // 保存原始方法
    const originalRefreshNewBooksDialog = PurchaseManagement.refreshNewBooksDialog;

    // 重写刷新新书对话框方法
    PurchaseManagement.refreshNewBooksDialog = function (orderId) {
        try {
            // 先检查其他模态框是否打开
            const orderDetailModal = document.getElementById('orderDetailModal');
            const orderDetailModalOpen = orderDetailModal && orderDetailModal.classList.contains('show');
            const addToStockModal = document.getElementById('addToStockModal');
            const addToStockModalOpen = addToStockModal && addToStockModal.classList.contains('show');

            // 如果有其他模态框打开，先关闭
            if (orderDetailModalOpen) {
                const bsOrderDetailModal = bootstrap.Modal.getInstance(orderDetailModal);
                if (bsOrderDetailModal) {
                    bsOrderDetailModal.hide();
                    setTimeout(() => this.actuallyRefreshNewBooksDialog(orderId), 300);
                    return;
                }
            }

            if (addToStockModalOpen) {
                const bsAddToStockModal = bootstrap.Modal.getInstance(addToStockModal);
                if (bsAddToStockModal) {
                    bsAddToStockModal.hide();
                    setTimeout(() => this.actuallyRefreshNewBooksDialog(orderId), 300);
                    return;
                }
            }

            // 如果没有其他模态框打开，直接刷新
            this.actuallyRefreshNewBooksDialog(orderId);
        } catch (error) {
            originalRefreshNewBooksDialog.call(this, orderId);
        }
    };

    // 添加实际刷新新书对话框的函数
    PurchaseManagement.actuallyRefreshNewBooksDialog = function (orderId) {
        try {
            // 先获取最新的订单数据
            API.purchase.getPurchase(orderId).then(response => {
                const order = response.order;
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
                            <td colspan="7" class="text-center">该进货单中没有新书或所有新书已添加到库存</td>
                        </tr>
                    `;

                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('newBooksModal'));
                        if (modal) {
                            modal.hide();
                        }
                    }, 3000);
                }

                const newBooksModal = document.getElementById('newBooksModal');
                if (newBooksModal) {
                    try {
                        const existingModal = bootstrap.Modal.getInstance(newBooksModal);
                        if (existingModal) {
                            if (!newBooksModal.classList.contains('show')) {
                                existingModal.show();
                            }
                        } else {
                            const modal = new bootstrap.Modal(newBooksModal);
                            modal.show();
                        }
                    } catch (err) { }
                }
            }).catch(() => { });
        } catch (error) { }
    };

    // ===================== 添加到库存按钮事件委托 =====================

    document.addEventListener('click', function (event) {
        // 查找匹配的添加到库存按钮
        const addToStockButton = event.target.closest('.btn-outline-primary');
        if (addToStockButton && addToStockButton.textContent.trim() === '添加到库存') {
            const isInNewBooksModal = addToStockButton.closest('#newBooksModal') !== null;
            const isInOrderDetailModal = addToStockButton.closest('#orderDetailModal') !== null;

            if (isInNewBooksModal || isInOrderDetailModal) {
                const onclickAttr = addToStockButton.getAttribute('onclick') || '';
                const match = onclickAttr.match(/openAddToStockDialog\((\d+)\)/);

                if (match && match[1]) {
                    const detailId = match[1];

                    // 阻止默认的onclick事件处理
                    event.preventDefault();
                    event.stopPropagation();

                    // 强制重置状态并确保模态框正确显示
                    const forceOpenAddToStockModal = function () {
                        document.getElementById('add-to-stock-detail-id').value = detailId;
                        document.getElementById('new-book-retail-price').value = '';

                        const addToStockModal = document.getElementById('addToStockModal');
                        const existingAddToStockModal = bootstrap.Modal.getInstance(addToStockModal);
                        if (existingAddToStockModal) {
                            existingAddToStockModal.dispose();
                        }

                        const modal = new bootstrap.Modal(addToStockModal);
                        modal.show();

                        addToStockModal.addEventListener('shown.bs.modal', function () {
                            document.getElementById('new-book-retail-price').focus();
                        }, { once: true });
                    };

                    // 先关闭所有可能的模态框
                    if (isInNewBooksModal) {
                        const newBooksModal = document.getElementById('newBooksModal');
                        if (newBooksModal && newBooksModal.classList.contains('show')) {
                            const bsNewBooksModal = bootstrap.Modal.getInstance(newBooksModal);
                            if (bsNewBooksModal) {
                                bsNewBooksModal.hide();
                                setTimeout(forceOpenAddToStockModal, 300);
                                return;
                            }
                        }
                    }

                    if (isInOrderDetailModal) {
                        const orderDetailModal = document.getElementById('orderDetailModal');
                        if (orderDetailModal && orderDetailModal.classList.contains('show')) {
                            const bsOrderDetailModal = bootstrap.Modal.getInstance(orderDetailModal);
                            if (bsOrderDetailModal) {
                                bsOrderDetailModal.hide();
                                setTimeout(forceOpenAddToStockModal, 300);
                                return;
                            }
                        }
                    }

                    forceOpenAddToStockModal();
                }
            }
        }
    });

    // ===================== 快速进货功能改进 =====================

    // 确保在Dashboard加载完成后再添加事件监听
    const initQuickPurchase = function () {
        // 检查Dashboard是否存在且已加载
        if (typeof Dashboard === 'undefined') {
            setTimeout(initQuickPurchase, 500);
            return;
        }

        // 使用事件委托，监听整个dashboard区域的点击
        document.getElementById('dashboard').addEventListener('click', function (event) {
            // 检查是否点击的是快速进货按钮或其子元素
            let target = event.target;
            while (target && target !== this) {
                if (target.classList.contains('quick-purchase-btn')) {
                    event.preventDefault(); // 阻止默认行为
                    event.stopPropagation(); // 阻止冒泡

                    // 获取图书ID
                    const bookId = target.getAttribute('data-book-id');
                    if (bookId) {
                        quickPurchaseBook(parseInt(bookId));
                    }
                    return;
                }
                target = target.parentNode;
            }
        });

        // 额外添加全局函数，方便调试和直接调用
        window.quickPurchaseBook = quickPurchaseBook;
    };

    // 初始化快速进货功能
    initQuickPurchase();

    // 定义快速进货功能
    function quickPurchaseBook(bookId) {
        // 切换到进货管理页面
        UI.showPage('purchase-management');

        // 等待确保页面加载完成
        setTimeout(() => {
            try {
                // 确保PurchaseManagement已经初始化
                if (!PurchaseManagement.eventsBound) {
                    PurchaseManagement.bindEvents();
                    PurchaseManagement.eventsBound = true;
                }

                // 打开创建进货单对话框
                PurchaseManagement.openCreateOrderDialog();

                // 给足够的时间让对话框显示出来
                setTimeout(() => {
                    try {
                        // 确保"已有图书"已选择（非新书）
                        const isNewBookCheckbox = document.getElementById('is-new-book');
                        if (isNewBookCheckbox && isNewBookCheckbox.checked) {
                            isNewBookCheckbox.checked = false;
                            // 使用原生事件触发change
                            isNewBookCheckbox.dispatchEvent(new Event('change'));
                        }

                        // 加载图书并进行后续操作
                        PurchaseManagement.loadBooks().then(() => {
                            setTimeout(() => {
                                try {
                                    // 在图书列表中选择对应图书
                                    const bookSelect = document.getElementById('existing-book-select');
                                    if (bookSelect) {
                                        // 设置选中的图书ID
                                        bookSelect.value = bookId;

                                        // 触发change事件
                                        bookSelect.dispatchEvent(new Event('change'));

                                        // 设置默认数量
                                        const quantityInput = document.getElementById('detail-quantity');
                                        if (quantityInput) {
                                            quantityInput.value = 10;
                                        }

                                        // 不自动设置进货价格，让用户输入
                                        const priceInput = document.getElementById('detail-purchase-price');
                                        if (priceInput) {
                                            priceInput.focus(); // 将焦点放在价格输入框上
                                            // 提示用户输入价格
                                            alert('请输入进货价格');
                                        }
                                    }
                                } catch (error) {
                                    alert('设置图书信息失败: ' + error.message);
                                }
                            }, 300);
                        }).catch(() => {
                            // 静默处理错误
                        });
                    } catch (error) {
                        alert('准备图书选择失败: ' + error.message);
                    }
                }, 500);
            } catch (error) {
                alert('快速创建进货单失败: ' + error.message);
            }
        }, 500);
    }
});
