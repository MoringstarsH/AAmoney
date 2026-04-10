# LumiSplit - AA账单应用

一个简洁优雅的AA制账单分摊应用，帮助你和朋友们轻松管理共同支出。

## ✨ 功能特点

- **旅行/活动账单管理** - 创建多个账单，分别管理不同活动的支出
- **成员管理** - 添加参与成员，支持普通成员和群组（如情侣）
- **支出记录** - 记录每笔支出，指定付款人和受益人
- **智能结算** - 自动计算最优还款方案，最小化转账次数
- **数据持久化** - 数据保存在浏览器本地存储中
- **响应式设计** - 移动端友好的界面设计

## 🚀 快速开始

### 方式一：直接打开（最简单）

1. 克隆仓库到本地
   ```bash
   git clone https://github.com/MoringstarsH/AAmoney.git
   cd AAmoney
   ```

2. 直接用浏览器打开 `index.html` 文件
   
   或者使用本地服务器（推荐）：
   ```bash
   # 使用 Python 3
   python -m http.server 8000
   
   # 或者使用 Node.js
   npx serve .
   ```

3. 在浏览器中访问 `http://localhost:8000`

### 方式二：GitHub Pages

访问在线演示：[https://MoringstarsH.github.io/AAmoney](https://MoringstarsH.github.io/AAmoney)

## 📱 使用指南

### 创建新账单
1. 点击首页的 "+" 按钮
2. 输入账单名称（如"周末露营"）
3. 添加参与成员

### 添加支出
1. 点击账单卡片进入详情
2. 点击 "记一笔" 按钮
3. 填写支出信息：
   - 金额
   - 描述（如"租车费"）
   - 付款人（谁付的钱）
   - 受益人（谁需要分摊）

### 查看结算
1. 在账单详情页点击 "结算" 标签
2. 查看每个人的余额情况
3. 按照推荐的转账方案进行还款

## 🛠️ 技术栈

- **React 18** - 用户界面框架
- **Tailwind CSS** - 样式框架（CDN）
- **Babel** - JSX 转译（CDN）
- **LocalStorage** - 数据持久化

## 📁 项目结构

```
AAmoney/
├── index.html          # 应用入口
├── src/
│   ├── App.jsx         # 主应用组件
│   ├── main.jsx        # 应用入口脚本
│   ├── icons.jsx       # 图标组件
│   ├── components/     # 可复用组件
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   └── Input.jsx
│   ├── utils/          # 工具函数
│   │   ├── format.js   # 格式化工具
│   │   └── settlement.js # 结算计算逻辑
│   ├── store/          # 数据存储
│   │   └── storage.js  # LocalStorage 封装
│   └── tests/          # 测试文件
│       └── settlement-tests.jsx
├── archive/            # 归档的旧版本
└── README.md           # 项目说明
```

## 💾 数据存储

应用使用浏览器的 LocalStorage 存储数据，这意味着：
- ✅ 数据会保存在你的浏览器中
- ✅ 刷新页面数据不会丢失
- ⚠️ 清除浏览器数据会丢失记录
- ⚠️ 不同浏览器/设备之间数据不互通

## 🔧 开发说明

这是一个纯前端应用，无需构建步骤即可运行。如需修改：

1. 编辑 `src/` 目录下的 JSX 文件
2. 刷新浏览器查看更改

所有组件使用 React 函数组件和 Hooks 编写。

## 📄 许可证

MIT License

## 🙏 致谢

- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
