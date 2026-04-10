(() => {
  const ENABLE = true;
  if (!ENABLE) return;
  const membersBase = [
    { id: 'a', name: '甲', isGroup: false, member_count: 1 },
    { id: 'b', name: '乙组', isGroup: true, member_count: 2 }
  ];
  const runCase = (cnt) => {
    const members = [ membersBase[0], { id:'b', name:'乙组', isGroup:true, member_count: cnt } ];
    const amount = 100;
    const expenses = [{ id:'e', description:'测试', amount, payerId:'a', beneficiaryIds:['a','b'] }];
    const { balances } = window.calculateSettlements(members, expenses);
    const weighted = 1 + cnt;
    const perPerson = Math.round((amount/weighted)*100)/100;
    const expectedB = -(perPerson*cnt);
    const expectedA = amount - perPerson; // 甲作为受益单人扣一次
    const ok = Math.abs(balances['b'] - expectedB) < 0.01 && Math.abs(balances['a'] - expectedA) < 0.01;
    console.log(`[TEST] group=${cnt} weighted=${weighted} per=${perPerson} →`, ok ? 'OK' : 'FAIL', balances);
    return ok;
  };
  const results = [];
  for (let i=1;i<=10;i++) results.push(runCase(i));
  const all = results.every(Boolean);
  console.log('[TEST] settlement weighted 1..10:', all ? 'ALL OK' : 'SOME FAIL');
})();
