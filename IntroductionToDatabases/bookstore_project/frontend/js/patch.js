// 这个文件添加一个隐藏的input元素到HTML，用于存储当前订单ID
document.addEventListener('DOMContentLoaded', function () {
    // 添加一个隐藏的输入框，用于存储当前订单ID
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'current-order-id';
    hiddenInput.value = '';
    document.body.appendChild(hiddenInput);
});
