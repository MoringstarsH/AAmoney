const fallbackDemoData = {
  tripName: '周末露营',
  members: [
    { id: 'm1', name: '小李' },
    { id: 'm2', name: '小王' },
    { id: 'm3', name: '小陈' }
  ],
  expenses: [
    { id: 'e1', description: '租车费', amount: 300, payerId: 'm1', beneficiaryIds: ['m1', 'm2', 'm3'] },
    { id: 'e2', description: '食材采购', amount: 150, payerId: 'm2', beneficiaryIds: ['m1', 'm2', 'm3'] }
  ]
};

const iconMap = {
  '车': '🚗', '租': '🚗', '油': '⛽', '交通': '🚌',
  '食': '🍽️', '餐': '🍽️', '饭': '🍚', '火锅': '🍲', '烧烤': '🍖', '食材': '🛒', '超市': '🛒', '买': '🛍️',
  '住': '🏨', '房': '🏨', '酒店': '🏨', '民宿': '🏠',
  '票': '🎫', '门': '🎫', '景点': '🏞️', '玩': '🎮',
  '酒': '🍺', '水': '💧', '饮': '🥤',
  '其他': '📦'
};
const memberEmojis = ['😊', '😎', '🤗', '🥳', '😄', '🤔'];

const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

function decodeDataFromUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get('data');
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(atob(raw)));
    if (!parsed || !Array.isArray(parsed.members)) return null;

    const members = parsed.members.map((m, index) => ({
      id: String(m.id || `m${index + 1}`),
      name: String(m.name || `成员${index + 1}`)
    }));
    const idSet = new Set(members.map((m) => m.id));

    const expenses = Array.isArray(parsed.expenses)
      ? parsed.expenses
          .map((e, index) => {
            const beneficiaryIds = Array.isArray(e.beneficiaryIds)
              ? e.beneficiaryIds.map((id) => String(id)).filter((id) => idSet.has(id))
              : [];
            const fallbackPayer = beneficiaryIds[0] || members[0]?.id || '';
            const payerId = idSet.has(String(e.payerId || '')) ? String(e.payerId) : fallbackPayer;
            return {
              id: String(e.id || `e${index + 1}`),
              description: String(e.description || '支出'),
              amount: Math.max(0, Number(e.amount) || 0),
              payerId,
              beneficiaryIds: beneficiaryIds.length ? beneficiaryIds : fallbackPayer ? [fallbackPayer] : []
            };
          })
          .filter((e) => e.amount > 0)
      : [];

    return {
      tripName: String(parsed.tripName || '分账演示'),
      members: members.length ? members : fallbackDemoData.members,
      expenses: expenses.length ? expenses : fallbackDemoData.expenses
    };
  } catch (error) {
    return null;
  }
}

function withVisualMeta(data) {
  return {
    tripName: data.tripName,
    members: data.members.map((member, index) => ({
      ...member,
      emoji: memberEmojis[index % memberEmojis.length]
    })),
    expenses: data.expenses.map((expense) => {
      let icon = '📦';
      for (let key in iconMap) {
        if (expense.description && expense.description.includes(key)) {
          icon = iconMap[key];
          break;
        }
      }
      return { ...expense, icon };
    })
  };
}

const demoData = withVisualMeta(decodeDataFromUrl() || fallbackDemoData);

class SplitAnimation {
  constructor(data) {
    this.data = data;
    this.characters = {};
    this.balances = {};
    this.scene = document.getElementById('scene');
    this.sceneWidth = 0;
    this.sceneHeight = 0;
    this.charWidth = 50;
    this.charHeight = 84;
    this.groundHeight = 60;
    this.groundY = 180;
    this.resizeTimer = null;
    this.boundResize = this.onResize.bind(this);
    this.updateSceneMetrics();
    this.init();
  }

  updateSceneMetrics() {
    this.sceneWidth = this.scene?.clientWidth || 360;
    this.sceneHeight = this.scene?.clientHeight || 300;
    const compact = this.sceneWidth < 420;
    this.charWidth = compact ? 46 : 50;
    this.charHeight = compact ? 80 : 84;
    this.groundY = Math.round(this.sceneHeight - this.groundHeight - 54);
  }

  clampLeft(left) {
    const min = 4;
    const max = Math.max(min, this.sceneWidth - this.charWidth - 4);
    return Math.max(min, Math.min(max, left));
  }

  leftToCenter(left) {
    return left + this.charWidth / 2;
  }

  getLineLefts(count) {
    if (count <= 0) return [];
    if (count === 1) return [this.clampLeft((this.sceneWidth - this.charWidth) / 2)];
    const edgePadding = Math.max(8, Math.min(24, this.sceneWidth * 0.08));
    const usable = Math.max(1, this.sceneWidth - this.charWidth - edgePadding * 2);
    const gap = usable / (count - 1);
    const lefts = [];
    for (let index = 0; index < count; index++) {
      lefts.push(this.clampLeft(edgePadding + gap * index));
    }
    return lefts;
  }

  init() {
    this.data.members.forEach((member) => {
      this.balances[member.id] = 0;
    });
    this.createCharacters();
    window.addEventListener('resize', this.boundResize);
    this.startAnimation();
  }

  onResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.updateSceneMetrics();
      this.relayoutCharacters();
    }, 120);
  }

  relayoutCharacters() {
    const lefts = this.getLineLefts(this.data.members.length);
    this.data.members.forEach((member, index) => {
      const char = this.characters[member.id];
      if (!char) return;
      const left = lefts[index] ?? this.clampLeft(char.x);
      char.originalX = left;
      char.x = left;
      char.element.style.left = `${left}px`;
      char.element.style.top = `${this.groundY}px`;
      char.element.style.width = `${this.charWidth}px`;
      char.element.style.height = `${this.charHeight}px`;
    });
  }

  createCharacters() {
    const container = document.getElementById('charactersLayer');
    container.innerHTML = '';
    this.characters = {};
    const lefts = this.getLineLefts(this.data.members.length);

    this.data.members.forEach((member, index) => {
      const charDiv = document.createElement('div');
      charDiv.className = 'character';
      charDiv.id = `char-${member.id}`;
      charDiv.innerHTML = `
        <div class="char-body">
          <div class="char-head">
            <div class="char-face">${member.emoji}</div>
          </div>
          <div class="char-torso char-color-${(index % 6) + 1}"></div>
          <div class="char-name" title="${member.name}">${member.name}</div>
        </div>
      `;

      const left = lefts[index] ?? this.clampLeft(index * 60);
      charDiv.style.left = `${left}px`;
      charDiv.style.top = `${this.groundY}px`;
      charDiv.style.width = `${this.charWidth}px`;
      charDiv.style.height = `${this.charHeight}px`;

      container.appendChild(charDiv);
      this.characters[member.id] = {
        ...member,
        element: charDiv,
        x: left,
        originalX: left
      };
    });
  }

  async startAnimation() {
    while (true) {
      await this.runOneCycle();
      await this.sleep(2500);
    }
  }

  async runOneCycle() {
    this.resetAll();

    this.setStep(0);
    this.setInstruction(`📍 ${this.data.tripName} - ${this.data.members.length}人小队出发！`);
    await this.sleep(1600);

    this.setStep(1);
    for (let i = 0; i < this.data.expenses.length; i++) {
      await this.processExpense(this.data.expenses[i]);
    }

    this.setStep(2);
    await this.showSettlement();
    await this.sleep(2800);
  }

  async processExpense(expense) {
    const beneficiaryIds = (expense.beneficiaryIds || []).filter((id) => this.characters[id]);
    const payerId = this.characters[expense.payerId] ? expense.payerId : beneficiaryIds[0];
    if (!payerId || !beneficiaryIds.length) return;

    const payer = this.characters[payerId];
    const amount = Number(expense.amount) || 0;
    const perPerson = round2(amount / beneficiaryIds.length);
    const locationLeft = this.clampLeft(Math.round(this.sceneWidth * 0.62) - this.charWidth / 2);

    this.showLocation(this.leftToCenter(locationLeft), expense.icon, expense.description);
    this.setInstruction(`💳 ${payer.name}支付了 ${expense.description} ¥${amount.toFixed(0)}`);

    payer.element.classList.add('walking');
    payer.element.style.left = `${locationLeft}px`;
    payer.x = locationLeft;
    await this.sleep(520);
    payer.element.classList.remove('walking');

    const teamMembers = beneficiaryIds.map((id) => this.characters[id]);
    await this.gatherTeam(teamMembers, locationLeft);

    payer.element.classList.add('jumping');
    this.spawnCoins(this.leftToCenter(locationLeft), this.groundY - 14, Math.max(4, teamMembers.length));

    teamMembers.forEach((member, index) => {
      const isPayer = member.id === payerId;
      const delta = round2(isPayer ? amount - perPerson : -perPerson);
      this.balances[member.id] = round2((this.balances[member.id] || 0) + delta);
      setTimeout(() => {
        this.showFloatText(this.leftToCenter(member.x), this.groundY - 24, `${delta > 0 ? '+' : ''}¥${Math.abs(delta).toFixed(0)}`, delta >= 0);
      }, index * 100);
    });

    await this.sleep(900);
    payer.element.classList.remove('jumping');

    this.showExpenseCard(expense, perPerson);
    await this.scatterTeam(teamMembers);
    document.getElementById('locationsLayer').innerHTML = '';
    await this.sleep(650);
  }

  async gatherTeam(members, centerLeft) {
    const spread = Math.max(24, this.charWidth * 0.72);
    members.forEach((member, index) => {
      if (Math.abs(member.x - centerLeft) < 1) return;
      const offset = (index - (members.length - 1) / 2) * spread;
      const target = this.clampLeft(centerLeft + offset);
      member.element.classList.add('walking');
      member.element.style.left = `${target}px`;
      member.x = target;
    });

    await this.sleep(480);
    members.forEach((member) => member.element.classList.remove('walking'));
  }

  async scatterTeam(members) {
    members.forEach((member) => {
      member.element.classList.add('walking');
      member.element.style.left = `${member.originalX}px`;
      member.x = member.originalX;
    });

    await this.sleep(500);
    members.forEach((member) => member.element.classList.remove('walking'));
  }

  spawnCoins(centerX, y, count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const coin = document.createElement('div');
        coin.className = 'coin flying';
        coin.textContent = '💰';
        coin.style.left = `${centerX + (Math.random() - 0.5) * 34}px`;
        coin.style.top = `${y}px`;

        const angle = Math.random() * Math.PI * 2;
        const distance = 64 + Math.random() * 30;
        coin.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        coin.style.setProperty('--ty', `${Math.sin(angle) * distance - 42}px`);

        document.getElementById('effectsLayer').appendChild(coin);
        setTimeout(() => coin.remove(), 850);
      }, i * 90);
    }
  }

  showFloatText(centerX, y, text, isPositive) {
    const div = document.createElement('div');
    div.className = `float-text ${isPositive ? 'positive' : 'negative'}`;
    div.textContent = text;
    div.style.left = `${centerX - 18}px`;
    div.style.top = `${y}px`;
    document.getElementById('effectsLayer').appendChild(div);
    setTimeout(() => div.remove(), 1200);
  }

  showLocation(centerX, icon, name) {
    const layer = document.getElementById('locationsLayer');
    const div = document.createElement('div');
    div.className = 'location-marker';
    div.style.left = `${centerX}px`;
    div.innerHTML = `
      <div class="location-icon">${icon}</div>
      <div class="location-name">${name}</div>
    `;
    layer.innerHTML = '';
    layer.appendChild(div);
  }

  showExpenseCard(expense, perPerson) {
    const payer = this.characters[expense.payerId] || this.characters[expense.beneficiaryIds[0]];
    const list = document.getElementById('expenseList');

    const card = document.createElement('div');
    card.className = 'expense-card';
    card.innerHTML = `
      <div class="expense-card-header">
        <span class="expense-card-title">${expense.icon} ${expense.description}</span>
        <span class="expense-card-amount">¥${round2(expense.amount).toFixed(0)}</span>
      </div>
      <div class="expense-card-detail">${payer ? payer.name : '成员'}支付 · ${expense.beneficiaryIds.length}人分摊 · 每人¥${round2(perPerson).toFixed(0)}</div>
    `;

    list.appendChild(card);
    setTimeout(() => card.classList.add('show'), 50);
  }

  async showSettlement() {
    document.getElementById('scene').classList.add('settlement');
    document.getElementById('locationsLayer').innerHTML = '';
    document.getElementById('expenseList').style.display = 'none';
    document.getElementById('settlementList').style.display = 'block';
    document.getElementById('settlementList').innerHTML = '';

    const debtors = [];
    const creditors = [];
    this.data.members.forEach((member) => {
      const bal = this.balances[member.id] || 0;
      if (bal < -0.01) debtors.push({ ...this.characters[member.id], needPay: -bal, balance: bal });
      if (bal > 0.01) creditors.push({ ...this.characters[member.id], shouldReceive: bal, balance: bal });
    });

    if (!debtors.length && !creditors.length) {
      this.setStep(3);
      this.setInstruction('🎉 账目已平，无需转账！');
      return;
    }

    this.setInstruction('📊 计算每个人的收支...');
    await this.sleep(900);

    const allPeople = [...debtors, ...creditors];
    const lefts = this.getLineLefts(allPeople.length);
    allPeople.forEach((person, index) => {
      const left = lefts[index];
      person.element.classList.add('walking');
      person.element.style.left = `${left}px`;
      person.element.style.top = `${this.groundY - 24}px`;
      person.x = left;
    });

    await this.sleep(700);
    allPeople.forEach((person) => person.element.classList.remove('walking'));

    this.setInstruction('💸 开始转账...');
    await this.sleep(450);

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.needPay, creditor.shouldReceive);

      if (amount > 0.01) {
        this.setInstruction(`${debtor.name} → ${creditor.name}  ¥${amount.toFixed(0)}`);
        debtor.element.classList.add('active');
        creditor.element.classList.add('active');
        this.addSettlementItem(debtor, creditor, amount);
        this.flyCoinBetween(this.leftToCenter(debtor.x), this.groundY - 8, this.leftToCenter(creditor.x), this.groundY - 8);
        await this.sleep(1400);
        debtor.element.classList.remove('active');
        creditor.element.classList.remove('active');
      }

      debtor.needPay -= amount;
      creditor.shouldReceive -= amount;
      if (debtor.needPay < 0.01) i++;
      if (creditor.shouldReceive < 0.01) j++;
    }

    this.setStep(3);
    this.setInstruction('✅ 结算完成！账目已平');
  }

  addSettlementItem(debtor, creditor, amount) {
    const list = document.getElementById('settlementList');
    const item = document.createElement('div');
    item.className = 'settlement-item';
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; color: #EF5350;">${debtor.name}</span>
        <span style="font-size: 11px; color: #EF5350; background: #FFEBEE; padding: 2px 6px; border-radius: 4px;">应付¥${(-debtor.balance).toFixed(0)}</span>
      </div>
      <span class="settlement-arrow">→</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; color: #66BB6A;">${creditor.name}</span>
        <span style="font-size: 11px; color: #66BB6A; background: #E8F5E9; padding: 2px 6px; border-radius: 4px;">应收¥${creditor.balance.toFixed(0)}</span>
      </div>
      <span class="settlement-amount">¥${amount.toFixed(0)}</span>
    `;
    list.appendChild(item);
    setTimeout(() => item.classList.add('show'), 50);
  }

  flyCoinBetween(x1, y1, x2, y2) {
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.textContent = '💰';
    coin.style.left = `${x1}px`;
    coin.style.top = `${y1}px`;
    coin.style.transition = 'all 0.55s ease-in-out';
    document.getElementById('effectsLayer').appendChild(coin);

    setTimeout(() => {
      coin.style.left = `${x2}px`;
      coin.style.top = `${y2}px`;
      coin.style.transform = 'scale(0.45)';
    }, 40);

    setTimeout(() => coin.remove(), 600);
  }

  resetAll() {
    this.updateSceneMetrics();

    this.data.members.forEach((member) => {
      this.balances[member.id] = 0;
    });

    document.getElementById('scene').classList.remove('settlement');
    document.getElementById('locationsLayer').innerHTML = '';
    document.getElementById('effectsLayer').innerHTML = '';
    document.getElementById('expenseList').innerHTML = '';
    document.getElementById('expenseList').style.display = 'block';
    document.getElementById('settlementList').innerHTML = '';
    document.getElementById('settlementList').style.display = 'none';

    const lefts = this.getLineLefts(this.data.members.length);
    this.data.members.forEach((member, index) => {
      const char = this.characters[member.id];
      if (!char) return;
      const left = lefts[index];
      char.originalX = left;
      char.x = left;
      char.element.style.left = `${left}px`;
      char.element.style.top = `${this.groundY}px`;
      char.element.style.width = `${this.charWidth}px`;
      char.element.style.height = `${this.charHeight}px`;
      char.element.classList.remove('active', 'walking', 'jumping');
    });
  }

  setStep(step) {
    document.querySelectorAll('.dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === step);
    });
  }

  setInstruction(text) {
    document.getElementById('instruction').textContent = text;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

new SplitAnimation(demoData);
