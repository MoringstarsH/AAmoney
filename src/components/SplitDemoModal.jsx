const { useState, useEffect, useRef } = React;

const memberEmojis = ['😊', '😎', '🤗', '🥳', '😄', '🤔'];
const memberColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

const iconMap = {
  '车': '🚗', '租': '🚗', '油': '⛽', '交通': '🚌',
  '食': '🍽️', '餐': '🍽️', '饭': '🍚', '火锅': '🍲', '烧烤': '🍖', '食材': '🛒', '超市': '🛒', '买': '🛍️',
  '住': '🏨', '房': '🏨', '酒店': '🏨', '民宿': '🏠',
  '票': '🎫', '门': '🎫', '景点': '🏞️', '玩': '🎮',
  '酒': '🍺', '水': '💧', '饮': '🥤'
};

const getIcon = (desc) => {
  for (let key in iconMap) {
    if (desc && desc.includes(key)) return iconMap[key];
  }
  return '💰';
};

function SplitDemoModal({ isOpen, onClose, tripName, members, expenses, balances, settlements }) {
  const [step, setStep] = useState(0);
  const [instruction, setInstruction] = useState('准备开始...');
  const [currentExpenseIdx, setCurrentExpenseIdx] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [coins, setCoins] = useState([]);
  const [expenseCards, setExpenseCards] = useState([]);
  const [settlementItems, setSettlementItems] = useState([]);
  const [isSettlementScene, setIsSettlementScene] = useState(false);
  const [localBalances, setLocalBalances] = useState({});
  
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // 初始化角色
  useEffect(() => {
    if (!isOpen || !members.length) return;
    
    const initialChars = members.map((m, i) => ({
      ...m,
      emoji: memberEmojis[i % memberEmojis.length],
      color: memberColors[i % memberColors.length],
      x: 60 + i * 100,
      y: 180,
      originalX: 60 + i * 100,
      isWalking: false,
      isJumping: false,
      isActive: false
    }));
    
    setCharacters(initialChars);
    setLocalBalances({});
    members.forEach(m => {
      setLocalBalances(prev => ({ ...prev, [m.id]: 0 }));
    });
  }, [isOpen, members]);

  // 动画循环
  useEffect(() => {
    if (!isOpen || !characters.length || !expenses.length) return;

    let cancelled = false;
    
    const runAnimation = async () => {
      while (!cancelled && isOpen) {
        // 重置
        setExpenseCards([]);
        setSettlementItems([]);
        setShowSettlement(false);
        setIsSettlementScene(false);
        setCurrentExpenseIdx(0);
        
        const newBalances = {};
        members.forEach(m => newBalances[m.id] = 0);
        setLocalBalances(newBalances);
        
        // 重置角色位置
        setCharacters(prev => prev.map((char, i) => ({
          ...char,
          x: char.originalX,
          y: 180,
          isWalking: false,
          isJumping: false,
          isActive: false
        })));
        
        // 步骤1: 介绍
        setStep(0);
        setInstruction(`📍 ${tripName || '账单'} - ${members.length}人小队出发！`);
        await sleep(2500);
        if (cancelled) break;
        
        // 步骤2: 每笔支出
        for (let i = 0; i < expenses.length; i++) {
          setStep(1);
          setCurrentExpenseIdx(i);
          const exp = expenses[i];
          const payer = members.find(m => m.id === exp.payerId);
          setInstruction(`${getIcon(exp.description)} ${payer?.name || '某人'}支付了 ${exp.description || '支出'} ¥${exp.amount || 0}`);
          
          // 移动角色
          const payerChar = characters.find(c => c.id === exp.payerId);
          const locationX = 200;
          
          if (payerChar) {
            setCharacters(prev => prev.map(c => {
              if (c.id === exp.payerId) {
                return { ...c, x: locationX, isWalking: true, isActive: true };
              }
              const isBeneficiary = exp.beneficiaryIds?.includes(c.id);
              if (isBeneficiary) {
                const offset = (Math.random() - 0.5) * 60;
                return { ...c, x: locationX + offset, isWalking: true };
              }
              return c;
            }));
            
            await sleep(600);
            
            // 停止走路，开始跳跃
            setCharacters(prev => prev.map(c => ({ 
              ...c, 
              isWalking: false,
              isJumping: c.id === exp.payerId 
            })));
            
            // 生成金币
            spawnCoins(locationX, 150);
            
            // 更新余额
            const perPerson = (Number(exp.amount) || 0) / (exp.beneficiaryIds?.length || 1);
            exp.beneficiaryIds?.forEach(id => {
              const isPayer = id === exp.payerId;
              const amount = isPayer ? (Number(exp.amount) || 0) - perPerson : -perPerson;
              setLocalBalances(prev => ({ ...prev, [id]: (prev[id] || 0) + amount }));
            });
            
            await sleep(500);
            
            setCharacters(prev => prev.map(c => ({ ...c, isJumping: false, isActive: false })));
          }
          
          // 添加支出卡片
          setExpenseCards(prev => [...prev, {
            description: exp.description || '支出',
            amount: exp.amount || 0,
            payerName: payer?.name || '某人',
            icon: getIcon(exp.description),
            beneficiaries: exp.beneficiaryIds?.length || 1
          }]);
          
          await sleep(1500);
          if (cancelled) break;
        }
        if (cancelled) break;
        
        // 步骤3: 结算
        setStep(2);
        setIsSettlementScene(true);
        setInstruction('💸 计算最优结算方案...');
        
        // 重新排列角色到结算位置
        const debtors = members.filter(m => (localBalances[m.id] || balances[m.id] || 0) < -0.01);
        const creditors = members.filter(m => (localBalances[m.id] || balances[m.id] || 0) > 0.01);
        const allPeople = [...debtors, ...creditors];
        
        if (allPeople.length > 0) {
          const spacing = 280 / (allPeople.length || 1);
          setCharacters(prev => prev.map(c => {
            const idx = allPeople.findIndex(p => p.id === c.id);
            if (idx >= 0) {
              return { ...c, x: 40 + spacing * idx, isWalking: true };
            }
            return c;
          }));
          
          await sleep(800);
          setCharacters(prev => prev.map(c => ({ ...c, isWalking: false })));
        }
        
        // 显示结算
        setShowSettlement(true);
        if (settlements && settlements.length > 0) {
          settlements.forEach((s, idx) => {
            setTimeout(() => {
              setSettlementItems(prev => [...prev, {
                from: members.find(m => m.id === s.from)?.name || '某人',
                to: members.find(m => m.id === s.to)?.name || '某人',
                amount: Number(s.amount) || 0
              }]);
            }, idx * 800);
          });
        }
        
        await sleep(2000);
        setStep(3);
        setInstruction('✅ 结算完成！账目已平');
        await sleep(4000);
        if (cancelled) break;
      }
    };
    
    runAnimation();
    
    return () => { cancelled = true; };
  }, [isOpen, members, expenses, tripName, settlements, characters.length]);

  const spawnCoins = (x, y) => {
    const newCoins = [];
    for (let i = 0; i < 5; i++) {
      newCoins.push({
        id: Date.now() + i,
        x: x + (Math.random() - 0.5) * 40,
        y: y,
        tx: (Math.random() - 0.5) * 100,
        ty: -50 - Math.random() * 50,
        delay: i * 100
      });
    }
    setCoins(newCoins);
    setTimeout(() => setCoins([]), 1000);
  };

  if (!isOpen) return null;

  const currentExp = expenses[currentExpenseIdx];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" ref={containerRef}>
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <span>🎬</span> 分账演示
          </h3>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20"
          >
            ✕
          </button>
        </div>
        
        {/* 动画区域 */}
        <div className="p-4">
          {/* 步骤指示器 */}
          <div className="flex justify-center gap-2 mb-3">
            {['准备', '支出', '结算', '完成'].map((label, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`h-2 rounded-full transition-all mb-1 ${step === i ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-300'}`} />
                <span className={`text-xs ${step === i ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>{label}</span>
              </div>
            ))}
          </div>
          
          {/* 说明文字 */}
          <p className="text-center text-sm text-slate-700 font-medium mb-3 min-h-[20px]">{instruction}</p>
          
          {/* 场景区域 */}
          <div 
            className={`relative h-56 rounded-2xl mb-3 overflow-hidden transition-colors duration-500 ${isSettlementScene ? 'bg-gradient-to-b from-purple-100 to-pink-100' : 'bg-gradient-to-b from-blue-100 to-indigo-100'}`}
          >
            {/* 地面 */}
            <div className="absolute bottom-0 w-full h-12 bg-slate-400" />
            
            {/* 地点标记 */}
            {step === 1 && currentExp && (
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
                <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl mb-1">
                  {getIcon(currentExp.description)}
                </div>
                <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
                  {currentExp.description}
                </span>
              </div>
            )}
            
            {/* 金币 */}
            {coins.map(coin => (
              <div
                key={coin.id}
                className="absolute text-xl transition-all duration-700 ease-out"
                style={{
                  left: `${coin.x}px`,
                  top: `${coin.y}px`,
                  transform: `translate(${coin.tx}px, ${coin.ty}px) scale(0.5)`,
                  opacity: 0
                }}
              >
                💰
              </div>
            ))}
            
            {/* 小人 */}
            {characters.map((char, i) => {
              const bal = localBalances[char.id] || balances[char.id] || 0;
              return (
                <div
                  key={char.id}
                  className="absolute flex flex-col items-center transition-all duration-500"
                  style={{
                    left: `${char.x}px`,
                    top: `${char.y}px`,
                    transform: char.isJumping ? 'translateY(-20px) scale(1.1)' : 'none'
                  }}
                >
                  {/* 头部 */}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md transition-all ${
                      char.isActive ? 'ring-4 ring-yellow-400' : ''
                    } ${showSettlement ? (bal > 0 ? 'bg-green-100' : bal < 0 ? 'bg-red-100' : 'bg-white') : 'bg-white'}`}
                  >
                    {char.emoji}
                  </div>
                  {/* 身体 */}
                  <div 
                    className="w-7 h-7 rounded-full -mt-2"
                    style={{ backgroundColor: char.color }}
                  />
                  {/* 名字 */}
                  <span className="text-xs font-bold text-slate-700 mt-1 bg-white/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {char.name}
                  </span>
                  {/* 走路动画 */}
                  {char.isWalking && (
                    <span className="absolute -bottom-1 text-xs animate-bounce">👣</span>
                  )}
                  {/* 余额 */}
                  {showSettlement && Math.abs(bal) > 0.01 && (
                    <span className={`text-xs font-bold mt-1 ${bal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {bal > 0 ? '应收' : '应付'} ¥{Math.abs(bal).toFixed(0)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 支出卡片 */}
          <div className="space-y-2 mb-3 max-h-24 overflow-y-auto">
            {expenseCards.map((card, idx) => (
              <div 
                key={idx}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-3 text-white animate-fade-in"
              >
                <div className="flex justify-between items-center">
                  <span className="text-lg">{card.icon} {card.description}</span>
                  <span className="text-xl font-bold">¥{card.amount}</span>
                </div>
                <div className="text-xs opacity-90 mt-1">
                  {card.payerName}支付 · {card.beneficiaries}人分摊
                </div>
              </div>
            ))}
          </div>
          
          {/* 结算列表 */}
          {showSettlement && settlementItems.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 max-h-28 overflow-y-auto">
              <div className="text-xs font-bold text-slate-500 mb-2 text-center">最终结算</div>
              {settlementItems.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between bg-white rounded-lg p-2 mb-2 shadow-sm animate-fade-in"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-500">{item.from}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-green-500">{item.to}</span>
                  </div>
                  <span className="font-bold text-indigo-600">¥{(Number(item.amount) || 0).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-center text-xs text-slate-400 mt-2">动画自动循环播放</p>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

window.SplitDemoModal = SplitDemoModal;
