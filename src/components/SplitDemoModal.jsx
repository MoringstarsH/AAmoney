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

const round2 = (num) => Math.round(Number(num || 0) * 100) / 100;

const getIcon = (desc) => {
  for (let key in iconMap) {
    if (desc && desc.includes(key)) return iconMap[key];
  }
  return '💰';
};

const getMemberWeight = (member) => {
  if (!member) return 1;
  if (typeof member.member_count === 'number' && member.member_count >= 1) return member.member_count;
  return member.isGroup ? 2 : 1;
};

const getLinePositions = (count, width, padding) => {
  if (count <= 0) return [];
  if (count === 1) return [Math.round(width / 2)];
  const safePadding = Math.max(22, Math.min(padding, width * 0.22));
  const available = Math.max(1, width - safePadding * 2);
  const gap = available / (count - 1);
  return Array.from({ length: count }, (_, idx) => Math.round(safePadding + gap * idx));
};

function SplitDemoModal({ isOpen, onClose, tripName, members, expenses, balances, settlements }) {
  const [step, setStep] = useState(0);
  const [instruction, setInstruction] = useState('准备开始...');
  const [currentExpenseIdx, setCurrentExpenseIdx] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [coins, setCoins] = useState([]);
  const [floatTexts, setFloatTexts] = useState([]);
  const [expenseCards, setExpenseCards] = useState([]);
  const [settlementItems, setSettlementItems] = useState([]);
  const [isSettlementScene, setIsSettlementScene] = useState(false);
  const [localBalances, setLocalBalances] = useState({});
  const [sceneWidth, setSceneWidth] = useState(360);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const syncWidth = () => {
      const width = sceneRef.current?.clientWidth || 360;
      setSceneWidth(Math.max(300, width));
    };
    syncWidth();
    let observer;
    if (window.ResizeObserver && sceneRef.current) {
      observer = new window.ResizeObserver(syncWidth);
      observer.observe(sceneRef.current);
    }
    window.addEventListener('resize', syncWidth);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', syncWidth);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !members.length) return;
    const baseY = 170;
    const xs = getLinePositions(members.length, sceneWidth, Math.max(28, sceneWidth * 0.1));
    const initialChars = members.map((member, idx) => ({
      ...member,
      emoji: memberEmojis[idx % memberEmojis.length],
      color: memberColors[idx % memberColors.length],
      x: xs[idx],
      y: baseY,
      originalX: xs[idx],
      isWalking: false,
      isJumping: false,
      isActive: false
    }));
    const initBalances = {};
    members.forEach((member) => {
      initBalances[member.id] = 0;
    });
    setCharacters(initialChars);
    setLocalBalances(initBalances);
  }, [isOpen, members, sceneWidth]);

  const spawnCoins = (x, y, count = 5) => {
    const created = Array.from({ length: count }, (_, idx) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 42;
      return {
        id: `${Date.now()}_${idx}_${Math.random()}`,
        x: x + (Math.random() - 0.5) * 36,
        y,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance - 42,
        delay: idx * 100
      };
    });
    setCoins((prev) => [...prev, ...created]);
    setTimeout(() => {
      setCoins((prev) => prev.filter((coin) => !created.some((createdCoin) => createdCoin.id === coin.id)));
    }, 1100);
  };

  const spawnFloatText = (x, y, text, isPositive, delay = 0) => {
    const id = `${Date.now()}_${Math.random()}`;
    setTimeout(() => {
      setFloatTexts((prev) => [...prev, { id, x, y, text, isPositive }]);
      setTimeout(() => {
        setFloatTexts((prev) => prev.filter((item) => item.id !== id));
      }, 1200);
    }, delay);
  };

  useEffect(() => {
    if (!isOpen || !members.length || !expenses.length) return;

    let cancelled = false;
    const baseY = 170;

    const runAnimation = async () => {
      while (!cancelled && isOpen) {
        const runningBalances = {};
        members.forEach((member) => {
          runningBalances[member.id] = 0;
        });

        setExpenseCards([]);
        setSettlementItems([]);
        setShowSettlement(false);
        setIsSettlementScene(false);
        setCurrentExpenseIdx(0);
        setCoins([]);
        setFloatTexts([]);
        setLocalBalances({ ...runningBalances });

        setCharacters((prev) => prev.map((char) => ({
          ...char,
          x: char.originalX,
          y: baseY,
          isWalking: false,
          isJumping: false,
          isActive: false
        })));

        setStep(0);
        setInstruction(`📍 ${tripName || '账单'} - ${members.length}人小队出发！`);
        await sleep(1800);
        if (cancelled) break;

        for (let idx = 0; idx < expenses.length; idx++) {
          const exp = expenses[idx];
          const beneficiaryIds = (exp.beneficiaryIds || []).filter((id) => members.some((m) => m.id === id));
          if (!beneficiaryIds.length) continue;

          const payerId = members.some((m) => m.id === exp.payerId) ? exp.payerId : beneficiaryIds[0];
          const payer = members.find((m) => m.id === payerId);
          const amount = Number(exp.amount) || 0;

          setStep(1);
          setCurrentExpenseIdx(idx);
          setInstruction(`${getIcon(exp.description)} ${payer?.name || '某人'}支付了 ${exp.description || '支出'} ¥${round2(amount)}`);

          const locationX = Math.round(sceneWidth * 0.62);
          const teamSpread = Math.max(26, Math.min(42, (sceneWidth - 110) / Math.max(beneficiaryIds.length, 2)));
          const centerIdx = (beneficiaryIds.length - 1) / 2;
          const teamXMap = {};
          beneficiaryIds.forEach((memberId, i) => {
            teamXMap[memberId] = Math.round(locationX + (i - centerIdx) * teamSpread * 0.7);
          });
          teamXMap[payerId] = locationX;

          setCharacters((prev) => prev.map((char) => {
            if (char.id === payerId) {
              return { ...char, x: locationX, isWalking: true, isActive: true };
            }
            if (beneficiaryIds.includes(char.id)) {
              return { ...char, x: teamXMap[char.id], isWalking: true };
            }
            return char;
          }));

          await sleep(560);
          if (cancelled) break;

          setCharacters((prev) => prev.map((char) => ({
            ...char,
            isWalking: false,
            isJumping: char.id === payerId
          })));
          spawnCoins(locationX, 140, Math.max(beneficiaryIds.length, 4));

          const weightedTotal = beneficiaryIds.reduce((sum, id) => {
            const member = members.find((m) => m.id === id);
            return sum + getMemberWeight(member);
          }, 0) || 1;
          const perWeight = amount / weightedTotal;
          const deltas = {};
          beneficiaryIds.forEach((id, i) => {
            const member = members.find((m) => m.id === id);
            const share = round2(perWeight * getMemberWeight(member));
            deltas[id] = round2((deltas[id] || 0) - share);
            spawnFloatText(teamXMap[id] + 16, 118, `-¥${Math.abs(share).toFixed(0)}`, false, i * 90);
          });
          deltas[payerId] = round2((deltas[payerId] || 0) + amount);

          if (!beneficiaryIds.includes(payerId)) {
            spawnFloatText(locationX + 16, 118, `+¥${amount.toFixed(0)}`, true, 0);
          } else {
            const net = round2(deltas[payerId]);
            spawnFloatText(locationX + 16, 146, `${net >= 0 ? '+' : '-'}¥${Math.abs(net).toFixed(0)}`, net >= 0, 0);
          }

          Object.keys(deltas).forEach((id) => {
            runningBalances[id] = round2((runningBalances[id] || 0) + deltas[id]);
          });
          setLocalBalances({ ...runningBalances });

          await sleep(700);
          if (cancelled) break;

          setCharacters((prev) => prev.map((char) => ({ ...char, isJumping: false, isActive: false })));
          setExpenseCards((prev) => [...prev, {
            description: exp.description || '支出',
            amount: round2(amount),
            payerName: payer?.name || '某人',
            icon: getIcon(exp.description),
            beneficiaries: beneficiaryIds.length
          }]);

          setCharacters((prev) => prev.map((char) => (
            beneficiaryIds.includes(char.id) || char.id === payerId
              ? { ...char, x: char.originalX, isWalking: true }
              : char
          )));
          await sleep(520);
          if (cancelled) break;
          setCharacters((prev) => prev.map((char) => ({ ...char, isWalking: false })));
          await sleep(380);
          if (cancelled) break;
        }
        if (cancelled) break;

        setStep(2);
        setIsSettlementScene(true);
        setInstruction('💸 计算最优结算方案...');

        const debtors = members
          .filter((member) => (runningBalances[member.id] || 0) < -0.01)
          .map((member) => ({ ...member, amount: Math.abs(runningBalances[member.id] || 0) }));
        const creditors = members
          .filter((member) => (runningBalances[member.id] || 0) > 0.01)
          .map((member) => ({ ...member, amount: runningBalances[member.id] || 0 }));

        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const allPeople = [...debtors, ...creditors];
        const settlementPositions = getLinePositions(allPeople.length, sceneWidth, Math.max(24, sceneWidth * 0.08));
        const settlementXMap = {};
        allPeople.forEach((person, idx) => {
          settlementXMap[person.id] = settlementPositions[idx];
        });

        if (allPeople.length) {
          setCharacters((prev) => prev.map((char) => {
            if (typeof settlementXMap[char.id] === 'number') {
              return { ...char, x: settlementXMap[char.id], y: 162, isWalking: true };
            }
            return char;
          }));
          await sleep(720);
          if (cancelled) break;
          setCharacters((prev) => prev.map((char) => ({ ...char, isWalking: false })));
        }

        setShowSettlement(true);
        setInstruction('📊 开始转账...');

        if (!debtors.length && !creditors.length) {
          await sleep(700);
          setStep(3);
          setInstruction('✅ 账目已平，无需转账');
          await sleep(2200);
          if (cancelled) break;
          continue;
        }

        let i = 0;
        let j = 0;
        while (i < debtors.length && j < creditors.length) {
          const debtor = debtors[i];
          const creditor = creditors[j];
          const transfer = round2(Math.min(debtor.amount, creditor.amount));
          if (transfer > 0.01) {
            setInstruction(`${debtor.name} → ${creditor.name}  ¥${transfer.toFixed(0)}`);
            setSettlementItems((prev) => [...prev, {
              from: debtor.name,
              to: creditor.name,
              amount: transfer
            }]);
            const startX = (settlementXMap[debtor.id] || Math.round(sceneWidth * 0.34)) + 16;
            const endX = (settlementXMap[creditor.id] || Math.round(sceneWidth * 0.66)) + 16;
            setCoins((prev) => [...prev, {
              id: `${Date.now()}_${Math.random()}`,
              x: startX,
              y: 122,
              tx: endX - startX,
              ty: 0,
              delay: 0
            }]);
            await sleep(1200);
            if (cancelled) break;
          }

          debtor.amount = round2(debtor.amount - transfer);
          creditor.amount = round2(creditor.amount - transfer);
          if (debtor.amount <= 0.01) i += 1;
          if (creditor.amount <= 0.01) j += 1;
        }

        setStep(3);
        setInstruction('✅ 结算完成！账目已平');
        await sleep(2800);
        if (cancelled) break;
      }
    };

    runAnimation();
    return () => {
      cancelled = true;
    };
  }, [isOpen, members, expenses, tripName, balances, settlements, sceneWidth]);

  if (!isOpen) return null;
  const currentExp = expenses[currentExpenseIdx];
  const compact = members.length >= 5;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-[30px] w-full max-w-[420px] md:max-w-[560px] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            <span>🎬</span> 分账演示
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20"
            aria-label="关闭演示"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex justify-center gap-3 sm:gap-4 mb-3">
            {['准备', '支出', '结算', '完成'].map((label, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className={`h-2 rounded-full transition-all mb-1 ${step === idx ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-300'}`} />
                <span className={`text-xs sm:text-sm ${step === idx ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>{label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-sm sm:text-base text-slate-700 font-medium mb-3 min-h-[24px]">{instruction}</p>

          <div
            ref={sceneRef}
            className={`relative h-56 sm:h-64 rounded-2xl mb-3 overflow-hidden transition-colors duration-500 ${isSettlementScene ? 'bg-gradient-to-b from-purple-100 to-pink-100' : 'bg-gradient-to-b from-blue-100 to-indigo-100'}`}
          >
            <div className="absolute bottom-0 w-full h-12 bg-slate-400" />

            {step === 1 && currentExp && (
              <div className="absolute bottom-12 left-[62%] -translate-x-1/2 flex flex-col items-center">
                <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl mb-1">
                  {getIcon(currentExp.description)}
                </div>
                <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
                  {currentExp.description || '支出'}
                </span>
              </div>
            )}

            {coins.map((coin) => (
              <div
                key={coin.id}
                className="absolute w-7 h-7 rounded-full bg-amber-400 border-2 border-amber-500 shadow-md flex items-center justify-center text-sm coin-fly"
                style={{
                  left: `${coin.x}px`,
                  top: `${coin.y}px`,
                  '--coin-tx': `${coin.tx}px`,
                  '--coin-ty': `${coin.ty}px`,
                  animationDelay: `${coin.delay || 0}ms`
                }}
              >
                💰
              </div>
            ))}

            {floatTexts.map((item) => (
              <div
                key={item.id}
                className={`absolute text-base font-extrabold float-up ${item.isPositive ? 'text-green-500' : 'text-red-500'}`}
                style={{ left: `${item.x}px`, top: `${item.y}px` }}
              >
                {item.text}
              </div>
            ))}

            {characters.map((char) => {
              const bal = localBalances[char.id] || balances[char.id] || 0;
              return (
                <div
                  key={char.id}
                  className="absolute flex flex-col items-center transition-all duration-500"
                  style={{
                    left: `${char.x}px`,
                    top: `${char.y}px`,
                    transform: char.isJumping ? 'translateY(-22px) scale(1.06)' : 'none'
                  }}
                >
                  <div
                    className={`${compact ? 'w-8 h-8 text-base' : 'w-10 h-10 text-lg sm:w-11 sm:h-11 sm:text-xl'} rounded-full flex items-center justify-center shadow-md transition-all ${
                      char.isActive ? 'ring-4 ring-yellow-400' : ''
                    } ${showSettlement ? (bal > 0 ? 'bg-green-100' : bal < 0 ? 'bg-red-100' : 'bg-white') : 'bg-white'}`}
                  >
                    {char.emoji}
                  </div>
                  <div
                    className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} rounded-full -mt-2`}
                    style={{ backgroundColor: char.color }}
                  />
                  <span className="text-xs font-bold text-slate-700 mt-1 bg-white/90 px-2 py-0.5 rounded-full max-w-[84px] truncate text-center">
                    {char.name}
                  </span>
                  {char.isWalking && (
                    <span className="absolute -bottom-1 text-xs animate-bounce">👣</span>
                  )}
                  {showSettlement && Math.abs(bal) > 0.01 && (
                    <span className={`text-[11px] font-bold mt-1 ${bal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {bal > 0 ? '应收' : '应付'} ¥{Math.abs(bal).toFixed(0)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 mb-3 max-h-24 sm:max-h-32 overflow-y-auto">
            {expenseCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-3 text-white fade-in"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-semibold">{card.icon} {card.description}</span>
                  <span className="text-lg sm:text-xl font-bold">¥{round2(card.amount).toFixed(0)}</span>
                </div>
                <div className="text-xs opacity-90 mt-1">
                  {card.payerName}支付 · {card.beneficiaries}组分摊
                </div>
              </div>
            ))}
          </div>

          {showSettlement && settlementItems.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 max-h-28 sm:max-h-36 overflow-y-auto">
              <div className="text-xs font-bold text-slate-500 mb-2 text-center">最终结算</div>
              {settlementItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white rounded-lg p-2 mb-2 shadow-sm fade-in"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-red-500">{item.from}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-green-500">{item.to}</span>
                  </div>
                  <span className="font-bold text-indigo-600">¥{round2(item.amount).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-2">动画自动循环播放</p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes coin-fly {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--coin-tx), var(--coin-ty)) scale(0.3) rotate(360deg); opacity: 0; }
        }
        .coin-fly {
          animation: coin-fly 0.8s ease-out forwards;
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-58px) scale(1.05); opacity: 0; }
        }
        .float-up {
          animation: float-up 1.2s ease-out forwards;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

window.SplitDemoModal = SplitDemoModal;
