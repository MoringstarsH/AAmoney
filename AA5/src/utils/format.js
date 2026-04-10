const generateId = () => Math.random().toString(36).substr(2, 9);
const formatMoney = (amount) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
window.generateId = generateId; window.formatMoney = formatMoney;
