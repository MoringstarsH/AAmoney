---
name: aamoney-dev
description: AA账单应用开发指南，包含纯前端架构、响应式适配、截图分享、数据压缩等最佳实践
---

# AAmoney 开发指南

AA账单应用（LumiSplit）是一个纯前端的 AA 制账单分摊应用。本 Skill 记录了项目开发过程中的架构设计、技术选型和最佳实践。

## 项目架构

### 技术栈
- **React 18** - 用户界面（CDN 引入，无需构建）
- **Tailwind CSS** - 样式框架（CDN）
- **Babel** - JSX 转译（CDN）
- **LocalStorage** - 数据持久化
- **html2canvas** - 截图生成

### 文件结构
```
AAmoney/
├── index.html              # 应用入口
├── share.html              # 分享页面（只读视图）
├── src/
│   ├── App.jsx             # 主应用组件
│   ├── main.jsx            # 应用入口脚本
│   ├── share.jsx           # 分享页面逻辑
│   ├── icons.jsx           # 图标组件
│   ├── components/         # 可复用组件
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   └── Input.jsx
│   ├── utils/              # 工具函数
│   │   ├── format.js       # 格式化工具
│   │   └── settlement.js   # 结算计算逻辑
│   ├── store/              # 数据存储
│   │   └── storage.js      # LocalStorage 封装
│   └── tests/              # 测试文件
│       └── settlement-tests.jsx
└── .kimi/skills/
    └── aamoney-dev/        # 本 Skill
        └── SKILL.md
```

## 核心功能实现

### 1. 纯前端无构建架构

不使用 npm/webpack/vite，直接通过 CDN 引入依赖：

```html
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
```

JSX 文件通过 Babel 实时转译：
```html
<script type="text/babel" src="./src/App.jsx"></script>
```

**优势**:
- 零配置，开箱即用
- 适合快速原型开发
- 无需构建步骤，部署简单

### 2. 响应式移动端适配

#### 视口高度适配
使用 `dvh` 动态视口高度替代 `vh`，解决移动端浏览器工具栏遮挡问题：

```jsx
<div className="h-[100dvh]">
```

#### 安全区域适配
针对刘海屏/灵动岛设备，使用 `env(safe-area-inset-bottom)`：

```jsx
<div className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
```

#### 响应式断点
```jsx
{/* 手机端全屏，桌面端居中 */}
<div className="w-full md:max-w-[400px] md:h-[800px] h-screen 
                md:rounded-[40px] md:border-[8px] md:border-white">
```

### 3. 结算算法实现

#### 加权分摊计算
支持普通成员（权重1）和小组/情侣（权重 n）：

```javascript
function calculateSettlements(members, expenses) {
  // 计算每人应付款
  expenses.forEach(exp => {
    const weightedTotal = exp.beneficiaryIds.reduce((sum, id) => {
      const member = members.find(m => m.id === id);
      const weight = member?.member_count || (member?.isGroup ? 2 : 1);
      return sum + weight;
    }, 0);
    
    const perPerson = exp.amount / weightedTotal;
    // ... 分摊逻辑
  });
  
  // 使用贪心算法生成最优结算方案
  // 最小化转账次数
}
```

#### 结算优化策略
1. 计算每人净余额（收入 - 支出）
2. 将成员分为债务人和债权人
3. 贪心匹配：债务人向债权人转账，优先结清大额

### 4. 截图分享功能

#### 保存相册
使用 `html2canvas` 生成结算方案截图：

```javascript
import html2canvas from 'html2canvas';

async function captureScreenshot(element) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,  // 高清截图
    useCORS: true,
    allowTaint: true
  });
  
  const link = document.createElement('a');
  link.download = `结算方案_${new Date().toLocaleString()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

**截图内容包含**:
- 账单名称和总支出（大字体突出显示）
- 成员支出统计（每人支付的总额）
- 结算方案（谁付给谁）
- 成员余额明细
- 完整支出明细列表
- 生成时间戳

#### 链接分享
将结算数据编码为 Base64 URL 参数：

```javascript
function generateShareLink(tripData) {
  const shareData = {
    tripName: tripData.name,
    members: tripData.members,
    expenses: tripData.expenses,
    createdAt: new Date().toLocaleString('zh-CN')
  };
  
  // 先 encodeURIComponent 处理中文，再 btoa 编码
  const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
  return `${window.location.origin}/share.html?data=${encoded}`;
}
```

**分享页面特点**:
- 只读视图，不可编辑
- 无返回按钮，保持简洁
- 独立的 `share.html` 和 `share.jsx`

### 5. 数据压缩优化（短链接）

为减少分享链接长度，使用短字段名映射和 ID 索引化：

```javascript
// 压缩数据：使用短字段名，ID 转为索引
const idMap = {};
activeTrip.members.forEach((m, idx) => { idMap[m.id] = idx; });

const compressedData = {
  n: activeTrip.name,                    // tripName
  c: time,                               // createdAt
  m: activeTrip.members.map(m => ({      // members
    n: m.name,                           // name
    g: m.isGroup ? 1 : 0,                // isGroup (0/1)
    c: m.member_count || (m.isGroup ? 2 : 1)
  })),
  e: activeTrip.expenses.map(exp => ({    // expenses
    d: exp.description,                  // description
    a: exp.amount,                       // amount
    p: idMap[exp.payerId],               // payerId (索引)
    b: exp.beneficiaryIds.map(id => idMap[id])  // beneficiaryIds (索引)
  }))
};

const encoded = btoa(encodeURIComponent(JSON.stringify(compressedData)));
```

**压缩效果**:
- 原始链接：~1500+ 字符
- 压缩后：~674 字符
- 减少约 **55%**

**字段映射表**:
| 原字段 | 压缩后 | 说明 |
|--------|--------|------|
| tripName | n | 账单名称 |
| members | m | 成员列表 |
| expenses | e | 支出列表 |
| description | d | 支出描述 |
| amount | a | 金额 |
| payerId | p | 付款人ID（索引） |
| beneficiaryIds | b | 受益人IDs（索引） |
| isGroup | g | 是否小组（0/1） |
| member_count | c | 小组人数 |
| createdAt | c | 创建时间 |

### 6. 数据一致性维护

#### 删除成员时的级联清理
删除成员时，需要同步清理所有相关数据，避免残留引用导致计算错误：

```javascript
const removeMemberFromTrip = (memberId) => {
  if (activeTrip.members.length <= 1) {
    showWarning('至少需要保留一位参与人。');
    return;
  }
  
  // 从成员列表中移除
  const updatedMembers = activeTrip.members.filter(m => m.id !== memberId);
  
  // 从所有支出的受益人列表中移除该成员
  const updatedExpenses = activeTrip.expenses.map(exp => {
    // 如果付款人被删除，重新指定付款人（默认为第一个成员）
    let newPayerId = exp.payerId;
    if (exp.payerId === memberId) {
      newPayerId = updatedMembers[0]?.id || '';
    }
    
    return {
      ...exp,
      payerId: newPayerId,
      beneficiaryIds: exp.beneficiaryIds.filter(id => id !== memberId)
    };
  }).filter(exp => exp.beneficiaryIds.length > 0); // 删除无受益人的支出
  
  updateActiveTrip({ members: updatedMembers, expenses: updatedExpenses });
};
```

**关键处理点**:
1. 从 `members` 数组中删除成员
2. 从 `expenses[*].beneficiaryIds` 中移除该成员ID
3. 如果该成员是付款人，重新指定付款人
4. 如果支出没有受益人了，删除该支出

### 7. 数据持久化

#### LocalStorage 封装
```javascript
const STORAGE_KEY = 'lumisplit_trips';

export const loadTrips = (defaultTrips) => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultTrips;
  } catch {
    return defaultTrips;
  }
};

export const saveTrips = (trips) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
};
```

### 8. 游戏风格演示动画 (SplitDemoModal)

结算页面添加了可视化分账演示动画，用小人角色模拟真实分账过程：

```jsx
// 使用方式
{showDemoModal && (
  <SplitDemoModal
    isOpen={showDemoModal}
    onClose={() => setShowDemoModal(false)}
    tripName={activeTrip.name}
    members={activeTrip.members}
    expenses={activeTrip.expenses}
    balances={balances}
    settlements={settlements}
  />
)}
```

**动画特性**:
- 角色系统：emoji头像 + 彩色身体，每人固定颜色
- 行走动画： payer 走向支出地点，受益人聚集
- 支付动画： payer 跳跃 + 金币飞散效果
- 智能图标：根据支出描述自动匹配图标（🚗车/🍽️餐/🏨住）
- 结算场景：背景变紫色，角色均匀分布显示应收/应付

**图标映射规则**:
```javascript
const iconMap = {
  '车': '🚗', '食': '🍽️', '饭': '🍚', '住': '🏨',
  '票': '🎫', '酒': '🍺', '超市': '🛒'
};
```

### 9. 数字金额安全处理

#### toFixed 错误预防
结算金额可能为字符串或 undefined，必须做类型转换：

```javascript
// ❌ 错误：可能导致 "toFixed is not a function"
<span>¥{amount.toFixed(0)}</span>
<span>¥{settlements[i].amount.toFixed(0)}</span>

// ✅ 正确：使用 Number() 转换
<span>¥{(Number(amount) || 0).toFixed(0)}</span>
<span>¥{(Number(s.amount) || 0).toFixed(0)}</span>

// 或封装为工具函数
const formatMoney = (amount) => {
  return '¥' + (Number(amount) || 0).toFixed(0);
};
```

**常见触发场景**:
- 结算数据从计算函数返回时未做 Number 转换
- 分享链接中的金额被 JSON 序列化/反序列化后变为字符串
- API 返回的数据类型不统一

### 10. 交互优化

#### 数字输入优化
小组人数输入框支持清空后重新输入：

```jsx
const [memberCountInput, setMemberCountInput] = useState('2');

<input
  type="number"
  value={memberCountInput}
  onChange={e => {
    const val = e.target.value;
    if (val === '') {
      setMemberCountInput('');  // 允许清空
    } else {
      const num = Math.min(99, Math.max(1, Number(val)));
      setMemberCountInput(String(num));
    }
  }}
  onBlur={() => {
    if (memberCountInput === '') {
      setMemberCountInput('1');  // 失焦时默认1
    }
  }}
/>
```

## 部署方案

### GitHub Pages
1. 推送代码到 GitHub 仓库
2. 设置 Build command: `echo "ok"` 或留空
3. Build output directory: `.`（根目录）

### Cloudflare Pages
同样适用纯静态部署，无需构建步骤。

## 开发技巧

### 缓存清除
修改代码后，更新 `index.html` 中的版本号强制刷新：
```html
<script src="./src/App.jsx?v=2"></script>
```

### 图标方案
使用 emoji 作为图标，无需引入图标库：
```jsx
const Camera = ({ size = 20 }) => <span style={{ fontSize: size }}>📷</span>;
const Share2 = ({ size = 20 }) => <span style={{ fontSize: size }}>🔗</span>;
```

### 调试技巧
- 使用浏览器开发者工具 Network 面板检查 CDN 加载
- LocalStorage 数据在 Application 面板查看
- 使用 `?t=timestamp` 参数强制刷新

## 更新日志

### 2025-04-13
- 🎬 添加分账演示动画组件 (SplitDemoModal)
  - 小人角色行走/跳跃动画
  - 地点图标智能匹配
  - 金币飞散效果
  - 结算场景角色分布
- 🐛 修复 `toFixed is not a function` 错误
  - 结算金额显示添加 Number() 转换
  - 分享链接金额处理加固

### 2025-04-12
- ✨ 添加成员支出统计（总支出下方显示每人支付总额）
- 🔗 优化分享链接长度（使用短字段名压缩，减少 55%）
- 🐛 修复删除成员时的数据一致性问题
- 🎨 优化结算分享页面布局（总支出突出显示、添加完整支出明细）

## 参考

- [React 18 CDN](https://react.dev/)
- [Tailwind CSS CDN](https://tailwindcss.com/)
- [html2canvas](https://html2canvas.hertzen.com/)
- [AAmoney GitHub](https://github.com/MoringstarsH/AAmoney)
