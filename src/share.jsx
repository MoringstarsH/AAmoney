const { useState, useEffect, useMemo } = React;
const { User, ArrowRightLeft, Share2 } = window;

function formatMoney(amount) {
  return '¥' + Number(amount).toFixed(2);
}

function calculateSettlements(members, expenses) {
  const balances = {};
  members.forEach(m => balances[m.id] = 0);
  expenses.forEach(exp => {
    const amount = parseFloat(exp.amount);
    const payerId = exp.payerId;
    const benIds = exp.beneficiaryIds || [];
    const weightedTotal = benIds.reduce((s, id) => {
      const mem = members.find(m => m.id === id);
      const cnt = mem?.member_count || (mem?.isGroup ? 2 : 1);
      return s + cnt;
    }, 0);
    const perPerson = (Math.round((amount / (weightedTotal || 1)) * 100) / 100);
    benIds.forEach(id => {
      const mem = members.find(m => m.id === id);
      const weight = mem?.member_count || (mem?.isGroup ? 2 : 1);
      balances[id] = (balances[id] || 0) - perPerson * weight;
    });
    balances[payerId] = (balances[payerId] || 0) + amount;
  });
  const debtors = [];
  const creditors = [];
  members.forEach(m => {
    const bal = balances[m.id];
    if (bal < -0.01) debtors.push({ ...m, amount: -bal });
    if (bal > 0.01) creditors.push({ ...m, amount: bal });
  });
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amt = Math.min(d.amount, c.amount);
    if (amt > 0.01) {
      settlements.push({ from: d.id, to: c.id, amount: Math.round(amt * 100) / 100 });
    }
    d.amount -= amt;
    c.amount -= amt;
    if (d.amount < 0.01) i++;
    if (c.amount < 0.01) j++;
  }
  return { balances, settlements };
}

function ShareApp() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const dataParam = urlParams.get('data');
      if (!dataParam) {
        setError('无效的分享链接');
        return;
      }
      const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
      setData(decoded);
    } catch (e) {
      setError('链接已损坏或过期');
    }
  }, []);

  const { balances, settlements } = useMemo(() => {
    if (!data) return { balances: {}, settlements: [] };
    return calculateSettlements(data.members, data.expenses);
  }, [data]);

  const totalSpent = useMemo(() => {
    if (!data) return 0;
    return data.expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  }, [data]);

  if (error) {
    return (
      <div className="w-full min-h-screen bg-[#eff3f9] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{error}</h1>
          <p className="text-slate-500">请检查链接是否正确</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full min-h-screen bg-[#eff3f9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#eff3f9] p-4">
      <div className="max-w-md mx-auto">
        {/* 分享卡片 */}
        <div className="bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-xl border border-white rounded-[32px] p-6 shadow-2xl mb-6">
          {/* 头部 */}
          <div className="mb-6 text-center">
            <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Trip Balance</p>
            <h2 className="text-2xl font-bold text-slate-800">{data.tripName} 账单</h2>
            <p className="text-slate-500 text-sm mt-1">总支出 {formatMoney(totalSpent)}</p>
            <p className="text-[10px] text-slate-400 mt-2">生成时间: {data.createdAt}</p>
          </div>

          {/* 结算方案 */}
          <div className="space-y-4 mb-8 text-left">
            {settlements.length === 0 ? (
              <div className="p-4 bg-green-50 rounded-2xl text-green-600 text-center font-bold">
                🎉 账目已清，无需转账！
              </div>
            ) : (
              settlements.map((s, idx) => {
                const fromUser = data.members.find(m => m.id === s.from);
                const toUser = data.members.find(m => m.id === s.to);
                return (
                  <div key={idx} className="relative p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{fromUser?.name || ''}</span>
                      <span className="text-slate-300 text-xs">→</span>
                      <span className="font-bold text-slate-700">{toUser?.name || ''}</span>
                    </div>
                    <span className="font-extrabold text-lg text-[#4338ca]">{formatMoney(s.amount)}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* 成员余额 */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">成员余额</h3>
            <div className="grid grid-cols-2 gap-3">
              {data.members.map(m => {
                const bal = balances[m.id] || 0;
                if (Math.abs(bal) < 0.01) return null;
                const isPos = bal > 0;
                return (
                  <div key={m.id} className="flex justify-between items-center text-xs bg-white/50 rounded-xl p-2">
                    <span className="text-slate-600">{m.name}</span>
                    <span className={`font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                      {isPos ? '+' : ''}{formatMoney(bal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部品牌 */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Powered by LumiSplit</p>
          </div>
        </div>

        {/* 提示 */}
        <div className="text-center text-xs text-slate-500">
          <p>此结算方案为只读视图</p>
        </div>
      </div>
    </div>
  );
}

window.ShareApp = ShareApp;

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(ShareApp));
