// 修复快速进货功能
document.addEventListener('DOMContentLoaded', () => {
    console.log('加载快速进货修复脚本');

    // 等待所有JS加载完成后执行
    setTimeout(() => {
        console.log('开始应用修复');

        // 确保Dashboard模块存在
        if (typeof Dashboard === 'undefined' || typeof Dashboard.loadLowStockBooks !== 'function') {
            console.error('Dashboard模块未正确加载');
            return;
        }

        // 保存原始方法引用
        const originalLoadLowStockBooks = Dashboard.loadLowStockBooks;

        // 替换方法
        Dashboard.loadLowStockBooks = async function () {
            try {
                // 调用原始方法
                await originalLoadLowStockBooks.call(this);
                // 查找并替换事件处理
                setTimeout(() => {
                    const quickPurchaseButtons = document.querySelectorAll('#low-stock-list button.quick-purchase-btn');
                    console.log(`找到 ${quickPurchaseButtons.length} 个快速进货按钮`);

                    // 为按钮添加事件监听器
                    quickPurchaseButtons.forEach(button => {
                        // 从data-book-id属性获取图书ID
                        const bookId = button.getAttribute('data-book-id');

                        // 添加新的事件监听器
                        button.addEventListener('click', () => {
                            console.log(`触发快速进货，图书ID: ${bookId}`);
                            handleQuickPurchase(parseInt(bookId));
                        });
                    });
                }, 500);
            } catch (error) {
                console.error('修复快速进货功能时出错:', error);
            }
        };

        // 快速进货处理函数
        window.handleQuickPurchase = function (bookId) {
            console.log(`开始快速进货处理，图书ID: ${bookId}`);

            // 切换到进货管理页面
            UI.showPage('purchase-management');

            // 等待500ms确保页面加载
            setTimeout(() => {
                // 确保PurchaseManagement已经初始化
                if (!PurchaseManagement.eventsBound) {
                    console.log('进货管理模块尚未初始化，先进行初始化');
                    PurchaseManagement.bindEvents();
                    PurchaseManagement.eventsBound = true;
                    PurchaseManagement.loadBooks();
                }

                // 打开创建进货单对话框
                console.log('打开进货单创建对话框');
                PurchaseManagement.openCreateOrderDialog();

                // 等待对话框打开
                setTimeout(() => {
                    // 确保已经选择"已有图书"（不是新书）
                    const isNewBookCheckbox = document.getElementById('is-new-book');
                    if (isNewBookCheckbox && isNewBookCheckbox.checked) {
                        isNewBookCheckbox.checked = false;
                        isNewBookCheckbox.dispatchEvent(new Event('change'));
                    }

                    // 加载图书列表
                    PurchaseManagement.loadBooks().then(() => {
                        // 图书列表加载完成后再等待一小段时间确保DOM更新
                        setTimeout(() => {
                            // 选择图书
                            const bookSelect = document.getElementById('existing-book-select');
                            if (bookSelect) {
                                bookSelect.value = bookId;
                                bookSelect.dispatchEvent(new Event('change'));
                                console.log(`已选择图书ID: ${bookId}`);

                                // 设置数量为10
                                document.getElementById('detail-quantity').value = 10;
                                console.log('已设置默认数量: 10');

                                // 点击添加明细按钮
                                setTimeout(() => {
                                    const addBtn = document.getElementById('add-detail-item-btn');
                                    if (addBtn) {
                                        addBtn.click();
                                        console.log('已添加至明细项');
                                    } else {
                                        console.error('未找到添加明细按钮');
                                    }
                                }, 200);
                            } else {
                                console.error('图书选择框未找到');
                            }
                        }, 200);
                    }).catch(err => {
                        console.error('加载图书列表失败:', err);
                    });
                }, 500);
            }, 500);
        };

        console.log('快速进货功能修复已应用');
    }, 1000);
});
