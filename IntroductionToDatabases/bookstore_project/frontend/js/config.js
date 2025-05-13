// 全局配置
const CONFIG = {
    // API服务器基础URL - 改为使用相对路径，这样会使用当前访问的域名和端口
    apiBaseUrl: '/api',

    // 库存预警阈值，低于此值将发出库存预警
    lowStockThreshold: 10,

    // 系统名称
    systemName: '书店管理系统',

    // 日期格式化选项
    dateFormat: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    },

    // 金额格式化选项
    currencyFormat: {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }
};