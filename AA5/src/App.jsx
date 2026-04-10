const { useState, useMemo, useEffect } = React;
const { Plus, Users, User, Wallet, ArrowRightLeft, Share2, ChevronLeft, Trash2, Check, CreditCard } = window;

const initialTrips = [
  {
    id: 'trip_1',
    name: '周末露营',
    coverColor: 'from-indigo-400 to-purple-400',
    members: [
      { id: 'm1', name: '小李', isGroup: false },
      { id: 'm2', name: '小王', isGroup: false },
      { id: 'm3', name: '情侣组(陈)', isGroup: true }
    ],
    expenses: [
      { id: 'e1', description: '租车费', amount: 600, payerId: 'm2', beneficiaryIds: ['m1', 'm2', 'm3'], date: Date.now() }
    ]
  },
  {
    id: 'trip_2',
    name: '周五火锅局',
    coverColor: 'from-orange-400 to-pink-400',
    members: [
      { id: 'm4', name: '老张', isGroup: false },
      { id: 'm5', name: '老李', isGroup: false },
      { id: 'm6', name: '老王', isGroup: false }
    ],
    expenses: [
      { id: 'e2', description: '食材采购', amount: 328.5, payerId: 'm4', beneficiaryIds: ['m4', 'm5', 'm6'], date: Date.now() - 86400000 }
    ]
  }
];

function App() {
  const [trips, setTrips] = useState(() => window.loadTrips(initialTrips));
  const [activeTripId, setActiveTripId] = useState(null);
  const [view, setView] = useState('list');
  const [warningMessage, setWarningMessage] = useState(null);
  const [newTripName, setNewTripName] = useState('');
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', payerId: '', beneficiaryIds: [] });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [isNewMemberGroup, setIsNewMemberGroup] = useState(false);
  const [newMemberCount, setNewMemberCount] = useState(2);

  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId) || null, [trips, activeTripId]);

  const { balances, settlements, totalSpent } = useMemo(() => {
    if (!activeTrip) return { balances: {}, settlements: [], totalSpent: 0 };
    const result = window.calculateSettlements(activeTrip.members, activeTrip.expenses);
    const total = activeTrip.expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    return { ...result, totalSpent: total };
  }, [activeTrip]);

  const updateActiveTrip = updates => {
    setTrips(prev => prev.map(t => (t.id === activeTripId ? { ...t, ...updates } : t)));
  };

  const formatMoney = window.formatMoney;

  const showWarning = message => {
    setWarningMessage(message);
    setTimeout(() => setWarningMessage(null), 3000);
  };
  useEffect(() => { window.saveTrips(trips); }, [trips]);

  const renderTripList = () => (
    <div className="flex flex-col h-full relative">
      <header className="flex justify-between items-center mb-8 pt-4 px-2">
        <div>
          <h2 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">My Wallet</h2>
          <h1 className="text-3xl font-bold text-slate-800">我的账单</h1>
        </div>
        <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-slate-400">
          <User size={20} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto space-y-5 pb-24 px-1 no-scrollbar">
        {trips.map(trip => {
          const tripTotal = trip.expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
          return (
            <div key={trip.id} onClick={() => { setActiveTripId(trip.id); setView('tripHome'); }} className="group relative w-full h-48 cursor-pointer transition-all hover:scale-[1.02]">
              <div className={`absolute inset-0 bg-gradient-to-br ${trip.coverColor} rounded-[32px] opacity-90 shadow-xl shadow-indigo-500/20 group-hover:shadow-2xl transition-all`}></div>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] rounded-[32px] border border-white/20"></div>
              <div className="relative h-full p-6 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                    {trip.members.length} 成员
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setTrips(prev => prev.filter(t => t.id !== trip.id)); }} className="px-2 py-1 rounded-full text-xs font-bold bg-white/70 text-rose-600 border border-white/50 hover:bg-white shadow-sm" title="删除账单">删除</button>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">{trip.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm opacity-80">总支出</span>
                    <span className="text-xl font-bold font-mono">{formatMoney(tripTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <Button onClick={() => { setNewTripName(''); setView('createTrip'); }} className="shadow-xl shadow-indigo-500/40 px-8 w-2/3 bg-slate-800 hover:bg-slate-900" icon={Plus}>新建账单</Button>
      </div>
    </div>
  );

  const renderCreateTrip = () => (
    <div className="flex flex-col h-full justify-center px-4">
      <div className="absolute top-6 left-4">
        <button onClick={() => setView('list')} className="p-2 bg-white/50 rounded-full hover:bg-white text-slate-600"><ChevronLeft size={24} /></button>
      </div>
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-lg shadow-indigo-200">
          <Wallet size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">开启新旅程</h1>
        <p className="text-slate-400">轻松记录，通透分账</p>
      </div>
      <Card className="mb-8">
        <Input label="行程名称" placeholder="例如：三亚五日游" value={newTripName} onChange={e => setNewTripName(e.target.value)} />
      </Card>
      <Button onClick={() => { if (!newTripName.trim()) return; const newId = window.generateId(); const newTrip = { id: newId, name: newTripName, coverColor: 'from-blue-400 to-cyan-400', members: [{ id: window.generateId(), name: '我', isGroup: false }], expenses: [] }; setTrips([...trips, newTrip]); setActiveTripId(newId); setView('tripHome'); }} className="w-full shadow-indigo-500/40">开始记账</Button>
    </div>
  );

  const renderTripHome = () => { if (!activeTrip) return null; return (
    <div className="flex flex-col h-full relative">
      <header className="grid grid-cols-3 items-center mb-6 pt-2">
        <div className="justify-self-start"><button onClick={() => { setActiveTripId(null); setView('list'); }} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"><ChevronLeft size={20} /><span className="text-sm font-bold">返回列表</span></button></div>
        <h1 className="text-lg font-bold text-slate-800 text-center">{activeTrip.name}</h1>
        <div></div>
      </header>
      <div className="relative mb-8">
        <div className={`absolute -top-4 -left-4 w-full h-full bg-gradient-to-r ${activeTrip.coverColor} blur-2xl rounded-full opacity-40 animate-pulse`}></div>
        <Card className="relative overflow-hidden text-center py-8 !bg-gradient-to-br !from-white/80 !to-white/40">
          <button onClick={() => setView('settlement')} className="absolute top-4 right-4 flex items-center px-3 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"><span className="text-xs font-bold">查看结算</span></button>
          <p className="text-slate-500 font-medium mb-1">总支出</p>
          <h2 className="text-4xl font-extrabold text-[#4338ca]">{formatMoney(totalSpent)}</h2>
          <div className="mt-4 flex justify-center gap-3"><span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold">{activeTrip.members.length} 成员</span><span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold">{activeTrip.expenses.length} 笔账目</span></div>
        </Card>
      </div>
      <div className="mb-8"><h3 className="font-bold text-slate-700 text-lg mb-4 px-2">参与人</h3>
        <div className="flex flex-wrap items-center gap-2">
          {activeTrip.members.map(m => (
            <div key={m.id} className="group flex items-center bg-white/50 border border-white/60 backdrop-blur-sm rounded-full pr-1 pl-3 py-1 text-sm font-medium text-slate-600 shadow-md shadow-slate-100/50">
              <span className="mr-1">{m.name}</span>
              {m.isGroup && <Users size={14} />}
              {m.isGroup && <span className="ml-1 text-[10px] text-indigo-500">·{m.member_count || 2}人</span>}
              <button onClick={() => { if (activeTrip.members.length > 1) { const updated = activeTrip.members.filter(x => x.id !== m.id); updateActiveTrip({ members: updated }); } else { showWarning('至少需要保留一位参与人。'); } }} className="text-slate-300 hover:text-slate-500 p-0.5 rounded-full transition-colors active:scale-90" title="移除成员"><Trash2 size={12} /></button>
            </div>))}
          <button onClick={() => setView('addMember')} className="flex items-center justify-center w-8 h-8 bg-white/50 border border-white/60 text-slate-400 rounded-full hover:bg-white transition-colors shadow-md shadow-slate-100/50 active:scale-90" title="添加成员"><Plus size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar"><div className="flex justify-between items-end mb-4 px-2"><h3 className="font-bold text-slate-700 text-lg">支出明细</h3></div>
        {activeTrip.expenses.length === 0 ? (<div className="text-center text-slate-400 py-10">暂无支出，记一笔吧</div>) : (
          <div className="flex flex-col gap-3">{activeTrip.expenses.map(exp => { const payer = activeTrip.members.find(m => m.id === exp.payerId); const weightedTotal = exp.beneficiaryIds.reduce((s,id)=>{ const mem = activeTrip.members.find(m=>m.id===id); const cnt = mem && typeof mem.member_count==='number' ? mem.member_count : ((mem && mem.isGroup)?2:1); return s+cnt; },0); const perPerson = (Math.round((parseFloat(exp.amount)/(weightedTotal||1))*100)/100); return (
            <div key={exp.id} className="relative flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/50 backdrop-blur-sm" onClick={() => { setNewExpense({ amount: String(exp.amount), description: exp.description, payerId: exp.payerId, beneficiaryIds: exp.beneficiaryIds }); setEditingExpenseId(exp.id); setView('addExpense'); }}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 font-bold text-xs">{(payer && payer.name ? payer.name[0] : '')}</div><div><p className="font-bold text-slate-700">{exp.description}</p><p className="text-xs text-slate-400">{(payer && payer.name) || ''} 付款·{weightedTotal}人平摊</p></div></div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800">-{formatMoney(exp.amount)}</span>
              </div>
              <button className="absolute top-[3px] right-3 text-slate-300 hover:text-rose-500 text-xs font-bold bg-transparent px-2 py-1" title="删除" onClick={(e) => { e.stopPropagation(); const updated = activeTrip.expenses.filter(e2 => e2.id !== exp.id); updateActiveTrip({ expenses: updated }); }}>
                删除
              </button>
            </div> ); })}</div> )}
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <Button onClick={() => { setNewExpense({ amount: '', description: '', payerId: activeTrip.members[0]?.id, beneficiaryIds: activeTrip.members.map(m => m.id) }); setView('addExpense'); }} className="shadow-xl shadow-indigo-500/40 px-8 w-2/3" icon={Plus}>记一笔</Button>
      </div>
    </div>
  ); };

  const renderAddMember = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6"><button onClick={() => setView('tripHome')} className="p-2 bg-white/50 rounded-full hover:bg-white"><ChevronLeft size={24} /></button><h2 className="text-xl font-bold text-slate-800">管理参与人</h2></div>
      <Card className="mb-6"><Input label="成员名称" placeholder="例如：小李 或 陈陈CP" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
        <div className="flex items-center justify-between mb-4 px-2"><span className="text-slate-600 font-medium">是否为小组/情侣?</span><button onClick={() => { const v = !isNewMemberGroup; setIsNewMemberGroup(v); if (v && (newMemberCount < 1 || newMemberCount > 10)) setNewMemberCount(2); }} className={`w-12 h-7 rounded-full p-1 transition-colors ${isNewMemberGroup ? 'bg-[#4338ca]' : 'bg-slate-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isNewMemberGroup ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>
        {isNewMemberGroup && (
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-slate-600 font-medium">小组人数</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-white/70 rounded-full border border-white/60" onClick={() => setNewMemberCount(c => Math.max(1, c-1))}>-</button>
              <input type="number" min={1} max={10} value={newMemberCount} onChange={e => { const v = Number(e.target.value); setNewMemberCount(Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : 2); }} className="w-16 text-center bg-white/50 border border-white/60 rounded-xl px-2 py-2" />
              <button className="px-3 py-1 bg-white/70 rounded-full border border-white/60" onClick={() => setNewMemberCount(c => Math.min(10, c+1))}>+</button>
            </div>
          </div>
        )}
        <Button onClick={() => { if (!newMemberName.trim()) return; const updatedMembers = [...activeTrip.members, { id: window.generateId(), name: newMemberName, isGroup: isNewMemberGroup, member_count: isNewMemberGroup ? newMemberCount : 1 }]; updateActiveTrip({ members: updatedMembers }); setNewMemberName(''); setIsNewMemberGroup(false); setNewMemberCount(2); }} className="w-full">添加成员</Button>
      </Card>
      <div className="flex-1 overflow-y-auto"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">当前成员</h3>
        <div className="grid grid-cols-1 gap-3">{activeTrip.members.map(m => (
          <div key={m.id} className="flex items-center justify-between p-4 bg-white/30 rounded-2xl border border-white/40"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${m.isGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{m.isGroup ? <Users size={16} /> : m.name[0]}</div><span className="font-bold text-slate-700">{m.name}</span>{m.isGroup && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">小组</span>}</div><button onClick={() => { if (activeTrip.members.length > 1) { const updated = activeTrip.members.filter(x => x.id !== m.id); updateActiveTrip({ members: updated }); } else { showWarning('至少需要保留一位参与人。'); } }} className="text-slate-400 hover:text-red-400 p-2"><Trash2 size={18} /></button></div>))}</div>
      </div>
    </div>
  );

  const renderAddExpense = () => { const toggleBeneficiary = id => { const current = newExpense.beneficiaryIds; if (current.includes(id)) { setNewExpense({ ...newExpense, beneficiaryIds: current.filter(x => x !== id) }); } else { setNewExpense({ ...newExpense, beneficiaryIds: [...current, id] }); } }; return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6"><button onClick={() => { setEditingExpenseId(null); setView('tripHome'); }} className="p-2 bg-white/50 rounded-full hover:bg白色"><ChevronLeft size={24} /></button><h2 className="text-xl font-bold text-slate-800">{editingExpenseId ? '编辑支出' : '记一笔'}</h2></div>
      <Card className="mb-6 !py-8"><div className="flex flex-col items-center justify-center gap-2"><span className="text-slate-400 text-sm font-medium">输入金额</span><div className="flex items-baseline text-[#4338ca]"><span className="text-3xl font-bold mr-1">¥</span><input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} className="text-5xl font-bold bg-transparent border-b-2 border-indigo-100 w-48 text-center focus:outline-none focus:border-indigo-500 transition-colors placeholder-indigo-200" placeholder="0.00" autoFocus /></div></div><div className="mt-6 px-4"><Input label="备注" placeholder="例如：超市采购、门票" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} /></div></Card>
      <div className="flex-1 overflow-y-auto space-y-6 px-1"><div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">付款人</h3><div className="flex flex-wrap gap-3">{activeTrip.members.map(m => (<button key={m.id} onClick={() => setNewExpense({ ...newExpense, payerId: m.id })} className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${newExpense.payerId === m.id ? 'bg-[#4338ca] text-white border-[#4338ca] shadow-md scale-105' : 'bg-white/40 text-slate-600 border-white/60 hover:bg白色'}`}>{m.name}</button>))}</div></div><div><div className="flex justify-between items-center mb-3 pl-2 pr-2"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">受益人 (分摊)</h3><button onClick={() => setNewExpense({ ...newExpense, beneficiaryIds: activeTrip.members.map(m => m.id) })} className="text-xs text-indigo-600 font-bold">全选</button></div><div className="grid grid-cols-2 gap-3">{activeTrip.members.map(m => { const selected = newExpense.beneficiaryIds.includes(m.id); return (<button key={m.id} onClick={() => toggleBeneficiary(m.id)} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${selected ? 'bg-teal-50 border-teal-200' : 'bg-white/30 border-transparent opacity-60'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center ${selected ? 'bg-teal-500 text-white' : 'bg-slate-200'}`}>{selected && <Check size={14} />}</div><span className={`text-sm font-bold ${selected ? 'text-teal-700' : 'text-slate-500'}`}>{m.name}</span></button>); })}</div></div></div>
      <div className="pt-6 pb-2"><Button className="w-full shadow-xl shadow-indigo-500/20" onClick={() => { if (!newExpense.amount || !newExpense.description) return; if (editingExpenseId) { const updated = activeTrip.expenses.map(e => e.id === editingExpenseId ? { ...e, ...newExpense, amount: parseFloat(newExpense.amount) } : e); updateActiveTrip({ expenses: updated }); setEditingExpenseId(null); } else { const expenseToAdd = { ...newExpense, id: window.generateId(), date: Date.now(), amount: parseFloat(newExpense.amount) }; updateActiveTrip({ expenses: [expenseToAdd, ...activeTrip.expenses] }); } setView('tripHome'); }}>保存支出</Button></div>
    </div>
  ); };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const renderSettlement = () => { const handleShare = type => { setConfirmOpen(true); }; const confirmContent = (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[85%] shadow-xl">
        <h3 className="text-lg font-bold text-slate-800 mb-2">结算确认</h3>
        <p className="text-sm text-slate-600 mb-3">分账方式：按加权人数均分（单人=1，小组=member_count）。单人应付 = 总金额 / 加权人数。</p>
        <div className="flex gap-2 justify-end">
          <button className="px-4 py-2 rounded-full bg-slate-200 text-slate-700" onClick={()=>setConfirmOpen(false)}>取消</button>
          <button className="px-4 py-2 rounded-full bg-indigo-600 text-white" onClick={()=>{ setConfirmOpen(false); showWarning('已确认结算方案（模拟）'); }}>确认</button>
        </div>
      </div>
    </div>
  ); return (
    <div className="flex flex-col h-full">
      <div className="flex items中心 gap-4 mb-6"><button onClick={() => setView('tripHome')} className="p-2 bg-white/50 rounded-full hover:bg白色"><ChevronLeft size={24} /></button><h2 className="text-xl font-bold text-slate-800">结算方案</h2></div>
        <div className="flex-1 overflow-y-auto pb-20"><div id="settlement-screenshot" className="bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-xl border border-white rounded-[32px] p-6 shadow-2xl text-center mb-6"><div className="mb-6"><p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Trip Balance</p><h2 className="text-2xl font-bold text-slate-800">{activeTrip.name} 账单</h2><p className="text-slate-500 text-sm mt-1">总支出 {formatMoney(totalSpent)}</p><p className="text-[12px] text-slate-500 mt-2">付款规则，单人应付=总金额/收益人数</p></div><div className="space-y-4 mb-8 text-left">{settlements.length === 0 ? (<div className="p-4 bg-green-50 rounded-2xl text-green-600 text-center font-bold">🎉 账目已清，无需转账！</div>) : (settlements.map((s, idx) => { const fromUser = activeTrip.members.find(m => m.id === s.from); const toUser = activeTrip.members.find(m => m.id === s.to); return (<div key={idx} className="relative p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify之间"><div className="flex items-center gap-3 z-10"><div className="flex flex-col items-center"><span className="font-bold text-slate-700">{(fromUser && fromUser.name) || ''}</span><span className="text-[10px] text-slate-400">付款方</span></div><div className="flex flex-col items-center px-2"><span className="text-xs text-slate-300">------------&gt;</span></div><div className="flex flex-col items-center"><span className="font-bold text-slate-700">{(toUser && toUser.name) || ''}</span><span className="text-[10px] text-slate-400">收款方</span></div></div><div className="z-10 font-extrabold text-lg text-[#4338ca]">{formatMoney(s.amount)}</div></div>); }))}</div><div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4 text-left">{activeTrip.members.map(m => { const bal = balances[m.id]; const isPos = bal > 0; if (Math.abs(bal) < 0.01) return null; return (<div key={m.id} className="flex justify之间 items-center text-xs"><span className="text-slate-500 font-medium">{m.name}</span><span className={`font-bold ${isPos ? 'text-teal-500' : 'text-rose-500'}`}>{isPos ? '+' : ''}{formatMoney(bal)}</span></div>); })}</div><div className="mt-8 text-[10px] text-slate-300 font-mono">Generated by LumiSplit</div></div></div>
      <div className="absolute bottom-6 left-0 right-0 flex gap-3 justify-center px-4"><Button variant="secondary" className="flex-1 bg-white" onClick={() => handleShare('save')}>保存相册</Button><Button variant="primary" className="flex-1" icon={Share2} onClick={() => handleShare('share')}>分享给朋友</Button></div>
      {confirmOpen && confirmContent}
    </div>
  ); };

  return (
    <div className="w-full min-h-screen bg-[#eff3f9] flex items-center justify-center font-sans text-slate-800 p-4">
      {warningMessage && (<div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-xl transition-all duration-300 z-50 animate-bounce">{warningMessage}</div>)}
      <div className="w-full max-w-[400px] h-[800px] relative bg-gradient-to-br from-[#f3f6fb] to-[#eef2f6] rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden border-[8px] border-white ring-1 ring-slate-200/50">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[50%] rounded-full bg-blue-200/40 blur-[80px] mix-blend-multiply pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-indigo-200/40 blur-[60px] mix-blend-multiply pointer-events-none"></div>
        <div className="absolute top-[40%] right-[-20%] w-[50%] h-[40%] rounded-full bg-teal-100/40 blur-[60px] mix-blend-multiply pointer-events-none"></div>
        <div className="relative z-10 h-full p-6 overflow-hidden flex flex-col">
          {view === 'list' && renderTripList()}
          {view === 'createTrip' && renderCreateTrip()}
          {view !== 'list' && view !== 'createTrip' && (
            <>
              {view === 'tripHome' && renderTripHome()}
              {view === 'addMember' && renderAddMember()}
              {view === 'addExpense' && renderAddExpense()}
              {view === 'settlement' && renderSettlement()}
            </>
          )}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1.5 bg-slate-300/50 rounded-full z-20"></div>
      </div>
    </div>
  );
}
window.App = App;
