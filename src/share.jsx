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

function decodeSharePayload(decoded) {
  if (decoded && Array.isArray(decoded.members) && Array.isArray(decoded.expenses)) {
    return decoded;
  }

  const members = (decoded.m || []).map((m, idx) => ({
    id: 'm' + idx,
    name: m.n,
    isGroup: m.g === 1,
    member_count: m.c
  }));

  const expenses = (decoded.e || []).map((exp, idx) => {
    const payerIdx = Number(exp.p);
    const payerId = Number.isInteger(payerIdx) && members[payerIdx] ? members[payerIdx].id : (members[0]?.id || '');
    const beneficiaryIds = (Array.isArray(exp.b) ? exp.b : [])
      .map(v => Number(v))
      .filter(v => Number.isInteger(v) && members[v])
      .map(v => members[v].id);
    if (beneficiaryIds.length === 0 && payerId) {
      beneficiaryIds.push(payerId);
    }
    return {
      id: 'e' + idx,
      description: exp.d,
      amount: Number(exp.a) || 0,
      payerId,
      beneficiaryIds
    };
  });

  return {
    tripName: decoded.n,
    createdAt: decoded.c,
    members,
    expenses
  };
}

function ShareApp() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const shortKey = urlParams.get('k');

        if (shortKey) {
          const apiUrl = new URL(`./api/share/${encodeURIComponent(shortKey)}`, window.location.href);
          const response = await fetch(apiUrl.toString());
          if (!response.ok) {
            if (!cancelled) setError('链接已失效或不存在');
            return;
          }
          const payload = await response.json();
          const decoded = payload?.data || payload;
          if (!cancelled) setData(decodeSharePayload(decoded));
          return;
        }

        const dataParam = urlParams.get('data');
        if (!dataParam) {
          if (!cancelled) setError('无效的分享链接');
          return;
        }
        const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
        if (!cancelled) setData(decodeSharePayload(decoded));
      } catch (e) {
        if (!cancelled) setError('链接已损坏或过期');
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  const { balances, settlements } = useMemo(() => {
    if (!data) return { balances: {}, settlements: [] };
    return calculateSettlements(data.members, data.expenses);
  }, [data]);

  const totalSpent = useMemo(() => {
    if (!data) return 0;
    return data.expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  }, [data]);

  const openAnimationWindow = () => {
    if (!data) return;
    const payload = {
      tripName: data.tripName || '分账演示',
      members: (data.members || []).map(m => ({
        id: m.id,
        name: m.name,
        isGroup: !!m.isGroup,
        member_count: m.member_count || (m.isGroup ? 2 : 1)
      })),
      expenses: (data.expenses || []).map(exp => ({
        id: exp.id,
        description: exp.description || '支出',
        amount: Number(exp.amount) || 0,
        payerId: exp.payerId,
        beneficiaryIds: Array.isArray(exp.beneficiaryIds) ? exp.beneficiaryIds : []
      }))
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const animationUrl = new URL('./animation.html', window.location.href);
    animationUrl.searchParams.set('data', encoded);
    const win = window.open(animationUrl.toString(), '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = animationUrl.toString();
    }
  };

  // 辅助函数：获取分摊人数描述
  const getSplitDesc = (beneficiaryIds) => {
    const weightedCount = beneficiaryIds.reduce((sum, id) => {
      const member = data.members.find(m => m.id === id);
      const count = member?.member_count || (member?.isGroup ? 2 : 1);
      return sum + count;
    }, 0);
    const personCount = beneficiaryIds.length;
    if (weightedCount === personCount) {
      return `${personCount}人分摊`;
    }
    return `${personCount}组(共${weightedCount}人)分摊`;
  };

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
          
          {/* 头部：账单名称 + 总支出 */}
          <div className="mb-6 text-center">
            <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Trip Balance</p>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{data.tripName}</h2>
            
            {/* 总支出 - 大字体突出显示 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 mb-3 relative">
              <button
                onClick={openAnimationWindow}
                className="absolute top-3 right-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-shadow"
                title="查看分账演示"
              >
                🎬 演示
              </button>
              <p className="text-slate-500 text-sm mb-1">总支出</p>
              <p className="text-4xl font-extrabold text-indigo-600">{formatMoney(totalSpent)}</p>
              <p className="text-xs text-slate-400 mt-1">共 {data.expenses.length} 笔支出</p>
              
              {/* 成员支出统计 */}
              <div className="mt-4 pt-4 border-t border-indigo-100">
                <p className="text-xs text-slate-500 mb-2">成员支出</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {data.members.map(m => {
                    const memberTotal = data.expenses
                      .filter(exp => exp.payerId === m.id)
                      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                    if (memberTotal <= 0) return null;
                    return (
                      <div key={m.id} className="bg-white/70 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-slate-600">{m.name}</span>
                        <span className="font-bold text-indigo-600 ml-1">{formatMoney(memberTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <p className="text-[12px] text-slate-500">付款规则：单人应付 = 总金额 / 受益人数</p>
            <p className="text-[10px] text-slate-400 mt-2">生成时间: {data.createdAt}</p>
          </div>

          {/* 结算方案 */}
          <div className="text-left mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <span>💸</span> 结算方案
            </h3>
            <div className="space-y-3">
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
                        <span className="text-slate-400 text-xs">→</span>
                        <span className="font-bold text-slate-700">{toUser?.name || ''}</span>
                      </div>
                      <span className="font-extrabold text-lg text-[#4338ca]">{formatMoney(s.amount)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 成员余额 */}
          <div className="border-t border-slate-200 pt-4 text-left mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <span>👥</span> 成员余额
            </h3>
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

          {/* 支出明细 - 全部显示 */}
          <div className="border-t border-slate-200 pt-4 text-left">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <span>📋</span> 支出明细
            </h3>
            <div className="space-y-2">
              {data.expenses.map((exp, idx) => {
                const payer = data.members.find(m => m.id === exp.payerId);
                return (
                  <div key={exp.id} className="bg-white/60 rounded-xl p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-700">{exp.description || '未命名支出'}</span>
                      <span className="font-bold text-slate-800">{formatMoney(exp.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>💳 {payer?.name || '未知'} 支付</span>
                      <span>{getSplitDesc(exp.beneficiaryIds)}</span>
                    </div>
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
