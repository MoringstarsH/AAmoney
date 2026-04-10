const round2 = (x) => Math.round(x * 100) / 100;
const calculateSettlements = (members, expenses) => {
  const balances = {};
  members.forEach(m => (balances[m.id] = 0));
  expenses.forEach(exp => {
    const payer = exp.payerId;
    const beneficiaries = exp.beneficiaryIds;
    const amount = parseFloat(exp.amount);
    if (!payer || beneficiaries.length === 0) return;
    const weightedTotal = beneficiaries.reduce((s, id) => {
      const mem = members.find(m => m.id === id);
      const cnt = mem && typeof mem.member_count === 'number' ? mem.member_count : ((mem && mem.isGroup) ? 2 : 1);
      return s + cnt;
    }, 0);
    const perPerson = round2(amount / (weightedTotal || 1));
    balances[payer] += amount;
    beneficiaries.forEach(bId => {
      const mem = members.find(m => m.id === bId);
      const cnt = mem && typeof mem.member_count === 'number' ? mem.member_count : ((mem && mem.isGroup) ? 2 : 1);
      balances[bId] -= round2(perPerson * cnt);
    });
  });
  let debtors = [];
  let creditors = [];
  Object.keys(balances).forEach(id => {
    const amount = balances[id];
    if (amount < -0.01) debtors.push({ id, amount });
    if (amount > 0.01) creditors.push({ id, amount });
  });
  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
    settlements.push({ from: debtor.id, to: creditor.id, amount: amount.toFixed(2) });
    debtor.amount += amount; creditor.amount -= amount;
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return { balances, settlements };
};
window.calculateSettlements = calculateSettlements;
