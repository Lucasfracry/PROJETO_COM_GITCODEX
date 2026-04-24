const STORAGE_KEY = 'pdv_pizzaria_v2';

const defaultData = {
  users: [{ username: 'admin', password: '1234', role: 'Admin' }],
  caixa: null,
  produtos: {
    pizzas: [
      { id: crypto.randomUUID(), nome: 'Mussarela', numero: 1, broto: 30, grande: 45 },
      { id: crypto.randomUUID(), nome: 'Calabresa', numero: 2, broto: 32, grande: 47 }
    ],
    adicionais: [{ id: crypto.randomUUID(), nome: 'Catupiry', preco: 5 }],
    bordas: [
      { id: crypto.randomUUID(), nome: 'Sem borda', preco: 0 },
      { id: crypto.randomUUID(), nome: 'Borda de cheddar', preco: 8 }
    ],
    bebidas: [{ id: crypto.randomUUID(), nome: 'Coca-Cola 2L', tipo: 'Refrigerante', preco: 14 }]
  },
  mesasAbertas: [],
  vendas: []
};

let db = load();
let session = { user: null, carrinho: [] };
const SHORTCUTS = [
  { combo: 'F2', action: 'Abrir aba PDV (Vendas)' },
  { combo: 'F3', action: 'Abrir aba Cadastro' },
  { combo: 'F4', action: 'Abrir aba Mesas Abertas' },
  { combo: 'F6', action: 'Abrir aba Tutorial' },
  { combo: 'Alt + 1', action: 'Selecionar tipo Pizza no item' },
  { combo: 'Alt + 2', action: 'Selecionar tipo Bebida no item' },
  { combo: 'Alt + S', action: 'Ativar/Desativar Pizza 2 sabores' },
  { combo: 'Alt + B', action: 'Selecionar tamanho Broto' },
  { combo: 'Alt + G', action: 'Selecionar tamanho Grande' },
  { combo: 'Ctrl + 1', action: 'Focar campo Tipo de item' },
  { combo: 'Ctrl + 2', action: 'Focar campo Produto principal' },
  { combo: 'Ctrl + 3', action: 'Focar segundo sabor (quando ativo)' },
  { combo: 'Ctrl + 4', action: 'Focar quantidade do item' },
  { combo: 'Ctrl + Enter', action: 'Adicionar item ao pedido' },
  { combo: 'Ctrl + Shift + Enter', action: 'Finalizar venda' }
];

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : structuredClone(defaultData);
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function brl(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function now() { return new Date(); }

const el = (id) => document.getElementById(id);

function init() {
  bindTabs();
  bindLogin();
  bindCashOpen();
  bindRegister();
  bindSales();
  bindProductManagement();
  bindShortcuts();
  bindHistory();
  fillDateTime();
  refreshAll();
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
}

function activateTab(tabId) {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === tabId));
  document.querySelectorAll('.panel').forEach((x) => x.classList.toggle('active', x.id === tabId));
  if (tabId === 'history') renderHistory();
  if (tabId === 'open-tables') renderOpenTables();
}

function bindLogin() {
  el('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = el('login-user').value.trim();
    const password = el('login-pass').value;
    const user = db.users.find((u) => u.username === username && u.password === password);
    if (!user) return alert('Usuário ou senha inválidos.');
    session.user = user;
    el('session-user').textContent = `${user.username} (${user.role})`;
    el('login-screen').classList.add('hidden');
    el('app').classList.remove('hidden');
  });
  el('logout').addEventListener('click', () => location.reload());
}

function fillDateTime() {
  const d = now();
  el('open-date').value = d.toLocaleDateString('pt-BR');
  el('open-time').value = d.toLocaleTimeString('pt-BR');
}

function bindCashOpen() {
  el('open-cash-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (db.caixa?.aberto) return alert('Já existe um caixa aberto.');
    const d = now();
    db.caixa = {
      aberto: true,
      data: d.toISOString(),
      horaAbertura: d.toISOString(),
      horaFechamento: null,
      valorInicial: Number(el('initial-amount').value),
      totalVendas: 0,
      pagamentos: { Dinheiro: 0, Cartão: 0, Pix: 0 }
    };
    save();
    refreshAll();
    alert('Caixa aberto com sucesso!');
  });
}

function addItem(list, item) { list.push({ id: crypto.randomUUID(), ...item }); save(); refreshAll(); }

function bindRegister() {
  el('pizza-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem(db.produtos.pizzas, {
      nome: el('pizza-name').value.trim(),
      numero: Number(el('pizza-number').value),
      broto: Number(el('pizza-broto-price').value),
      grande: Number(el('pizza-grande-price').value)
    });
    e.target.reset();
  });
  el('extra-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem(db.produtos.adicionais, { nome: el('extra-name').value, preco: Number(el('extra-price').value) });
    e.target.reset();
  });
  el('edge-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem(db.produtos.bordas, { nome: el('edge-name').value, preco: Number(el('edge-price').value) });
    e.target.reset();
  });
  el('drink-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem(db.produtos.bebidas, {
      nome: el('drink-name').value,
      tipo: el('drink-type').value,
      preco: Number(el('drink-price').value)
    });
    e.target.reset();
  });
}

function bindSales() {
  el('sale-type').addEventListener('change', adjustSaleTypeFields);
  el('product-type').addEventListener('change', updateProductSelector);
  el('two-flavors').addEventListener('change', updateSecondFlavorVisibility);
  el('add-item').addEventListener('click', addOrderItem);
  el('cancel-order').addEventListener('click', () => { session.carrinho = []; renderOrder(); });
  el('order-items').addEventListener('click', onOrderListAction);
  el('sale-form').addEventListener('submit', finishSale);
}

function bindProductManagement() {
  ['pizza-list', 'extra-list', 'edge-list', 'drink-list'].forEach((id) => {
    el(id).addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const listType = btn.dataset.type;
      const itemId = btn.dataset.id;
      if (btn.dataset.action === 'delete') deleteRegisteredItem(listType, itemId);
      if (btn.dataset.action === 'edit') editRegisteredItem(listType, itemId);
    });
  });
}

function bindShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') { e.preventDefault(); activateTab('sales'); }
    if (e.key === 'F3') { e.preventDefault(); activateTab('register'); }
    if (e.key === 'F4') { e.preventDefault(); activateTab('open-tables'); }
    if (e.key === 'F6') { e.preventDefault(); activateTab('tutorial'); }

    if (e.altKey && e.key === '1') { e.preventDefault(); el('product-type').value = 'pizza'; updateProductSelector(); }
    if (e.altKey && e.key === '2') { e.preventDefault(); el('product-type').value = 'drink'; updateProductSelector(); }
    if (e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (el('product-type').value !== 'pizza') return;
      el('two-flavors').checked = !el('two-flavors').checked;
      updateSecondFlavorVisibility();
    }
    if (e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); el('pizza-order-size').value = 'broto'; }
    if (e.altKey && e.key.toLowerCase() === 'g') { e.preventDefault(); el('pizza-order-size').value = 'grande'; }

    if (e.ctrlKey && !e.shiftKey && e.key === '1') { e.preventDefault(); el('product-type').focus(); }
    if (e.ctrlKey && !e.shiftKey && e.key === '2') { e.preventDefault(); el('product-id').focus(); }
    if (e.ctrlKey && !e.shiftKey && e.key === '3') { e.preventDefault(); if (!el('product-id-second').classList.contains('hidden')) el('product-id-second').focus(); }
    if (e.ctrlKey && !e.shiftKey && e.key === '4') { e.preventDefault(); el('product-qty').focus(); }

    if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') { e.preventDefault(); addOrderItem(); }
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') { e.preventDefault(); el('sale-form').requestSubmit(); }
  });
}

function adjustSaleTypeFields() {
  const t = el('sale-type').value;
  el('address-wrap').classList.toggle('hidden', t !== 'Delivery');
  el('phone-wrap').classList.toggle('hidden', t !== 'Delivery');
  el('table-wrap').classList.toggle('hidden', t !== 'Mesa');
}

function updateProductSelector() {
  const type = el('product-type').value;
  const source = type === 'pizza' ? db.produtos.pizzas : db.produtos.bebidas;

  if (type === 'pizza') {
    el('product-id').innerHTML = source.map((p) => `<option value="${p.id}">#${p.numero} ${p.nome} (Broto ${brl(p.broto)} | Grande ${brl(p.grande)})</option>`).join('');
    el('product-id-second').innerHTML = source.map((p) => `<option value="${p.id}">#${p.numero} ${p.nome} (Broto ${brl(p.broto)} | Grande ${brl(p.grande)})</option>`).join('');
  } else {
    el('product-id').innerHTML = source.map((p) => `<option value="${p.id}">${p.nome} - ${brl(p.preco)}</option>`).join('');
    el('product-id-second').innerHTML = '';
    el('two-flavors').checked = false;
  }

  el('sale-edge').innerHTML = db.produtos.bordas.map((b) => `<option value="${b.id}">Borda: ${b.nome} (+${brl(b.preco)})</option>`).join('');
  el('sale-extra').innerHTML = '<option value="">Sem adicional</option>' + db.produtos.adicionais.map((a) => `<option value="${a.id}">Extra: ${a.nome} (+${brl(a.preco)})</option>`).join('');
  const pizzaOptions = type === 'pizza';
  el('two-flavors-wrap').classList.toggle('hidden', !pizzaOptions);
  updateSecondFlavorVisibility();
  el('pizza-order-size').disabled = !pizzaOptions;
  el('pizza-order-size').classList.toggle('hidden', !pizzaOptions);
  el('sale-edge').disabled = !pizzaOptions;
  el('sale-extra').disabled = !pizzaOptions;
}

function updateSecondFlavorVisibility() {
  const isPizza = el('product-type').value === 'pizza';
  const showSecondFlavor = isPizza && el('two-flavors').checked;
  el('product-id-second').classList.toggle('hidden', !showSecondFlavor);
}

function addOrderItem() {
  if (!db.caixa?.aberto) return alert('Abra o caixa antes de vender.');
  const type = el('product-type').value;
  const qty = Number(el('product-qty').value) || 1;
  const source = type === 'pizza' ? db.produtos.pizzas : db.produtos.bebidas;
  const product = source.find((x) => x.id === el('product-id').value);
  if (!product) return;

  let totalUnit = 0;
  const item = { tipo: type, nome: product.nome, qtd: qty, base: 0, borda: null, adicional: null };

  if (type === 'pizza') {
    const secondProduct = el('two-flavors').checked ? source.find((x) => x.id === el('product-id-second').value) : null;
    if (el('two-flavors').checked && !secondProduct) return alert('Selecione o segundo sabor da pizza.');
    const pizzaSize = el('pizza-order-size').value;
    const firstPrice = pizzaSize === 'broto' ? Number(product.broto) : Number(product.grande);
    const secondPrice = secondProduct ? (pizzaSize === 'broto' ? Number(secondProduct.broto) : Number(secondProduct.grande)) : 0;
    const pizzaBase = Math.max(firstPrice, secondPrice);
    totalUnit = pizzaBase;
    item.tamanho = pizzaSize === 'broto' ? 'Broto' : 'Grande';
    item.nome = secondProduct ? `${product.nome} / ${secondProduct.nome}` : product.nome;
    item.base = pizzaBase;

    const borda = db.produtos.bordas.find((x) => x.id === el('sale-edge').value);
    const adicional = db.produtos.adicionais.find((x) => x.id === el('sale-extra').value);
    if (borda) { totalUnit += Number(borda.preco); item.borda = borda.nome; }
    if (adicional) { totalUnit += Number(adicional.preco); item.adicional = adicional.nome; }
    item.total = totalUnit * qty;
  } else {
    totalUnit = Number(product.preco);
    item.base = totalUnit;
    item.total = totalUnit * qty;
  }

  session.carrinho.push(item);
  renderOrder();
}

function onOrderListAction(e) {
  const btn = e.target.closest('button[data-order-action]');
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  if (Number.isNaN(idx)) return;
  if (btn.dataset.orderAction === 'remove') {
    session.carrinho.splice(idx, 1);
    renderOrder();
  }
  if (btn.dataset.orderAction === 'edit') {
    const current = session.carrinho[idx];
    if (!current) return;
    const nextQty = Number(prompt('Nova quantidade:', String(current.qtd)));
    if (!nextQty || nextQty < 1) return alert('Quantidade inválida.');
    const unitPrice = current.total / current.qtd;
    current.qtd = nextQty;
    current.total = unitPrice * nextQty;
    renderOrder();
  }
}

function validateSaleType() {
  const t = el('sale-type').value;
  if (t === 'Delivery') {
    if (!el('customer-name').value.trim() || !el('customer-address').value.trim() || !el('customer-phone').value.trim()) {
      return 'Delivery exige nome, endereço e telefone.';
    }
  }
  if (t === 'Mesa' && !el('table-number').value) return 'Mesa exige número da mesa.';
  if (t === 'Balcão' && !el('customer-name').value.trim()) return 'Balcão exige nome do cliente.';
  return null;
}

function finishSale(e) {
  e.preventDefault();
  if (!db.caixa?.aberto) return alert('Caixa fechado.');
  const err = validateSaleType();
  if (err) return alert(err);
  if (!session.carrinho.length) return alert('Adicione itens ao pedido.');

  const total = session.carrinho.reduce((s, i) => s + i.total, 0);
  const pagamento = el('payment-method').value;
  const tipoVenda = el('sale-type').value;

  if (tipoVenda === 'Mesa') {
    const numeroMesa = Number(el('table-number').value);
    let mesa = db.mesasAbertas.find((m) => m.numeroMesa === numeroMesa);
    if (!mesa) {
      mesa = {
        id: crypto.randomUUID(),
        numeroMesa,
        cliente: el('customer-name').value || `Mesa ${numeroMesa}`,
        abertoEm: now().toISOString(),
        itens: [],
        total: 0,
        pagamento
      };
      db.mesasAbertas.push(mesa);
    }

    mesa.itens.push(...structuredClone(session.carrinho));
    mesa.total += total;
    mesa.pagamento = pagamento;
    save();

    session.carrinho = [];
    e.target.reset();
    el('two-flavors').checked = false;
    updateSecondFlavorVisibility();
    adjustSaleTypeFields();
    updateProductSelector();
    renderOrder();
    renderOpenTables();
    alert(`Itens adicionados à Mesa ${numeroMesa}.`);
    return;
  }

  const sale = {
    id: crypto.randomUUID(),
    data: now().toISOString(),
    tipoVenda,
    cliente: el('customer-name').value,
    endereco: el('customer-address').value || '',
    telefone: el('customer-phone').value || '',
    itens: structuredClone(session.carrinho),
    pagamento,
    total
  };

  registerSale(sale);
  printSaleReceipt(sale);

  session.carrinho = [];
  e.target.reset();
  el('two-flavors').checked = false;
  updateSecondFlavorVisibility();
  adjustSaleTypeFields();
  updateProductSelector();
  renderOrder();
  renderHistory();
  alert('Venda finalizada!');
}

function registerSale(sale) {
  db.vendas.push(sale);
  db.caixa.totalVendas += sale.total;
  db.caixa.pagamentos[sale.pagamento] += sale.total;
  save();
}

function printSaleReceipt(sale) {
  const lines = sale.itens.map((item) => {
    const detail = [item.tamanho, item.borda, item.adicional].filter(Boolean).join(' | ');
    return `<tr>
      <td>${item.qtd}x ${item.nome}${detail ? `<br><small>${detail}</small>` : ''}</td>
      <td class="right">${brl(item.total)}</td>
    </tr>`;
  }).join('');

  const content = `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Comanda ${sale.id}</title>
      <style>
        body { font-family: 'Courier New', monospace; margin: 0; color: #000; font-size: 17px; font-weight: 800; }
        .receipt { width: 72mm; margin: 0 auto; padding: 3mm; }
        h1, p { margin: 0; font-weight: 800; }
        .center { text-align: center; font-weight: 900; }
        .muted { font-size: 15px; margin-top: 2px; font-weight: 800; }
        hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 16px; font-weight: 800; }
        td { vertical-align: top; padding: 4px 0; font-weight: 800; }
        small { font-size: 14px; font-weight: 800; }
        .right { text-align: right; white-space: nowrap; }
        .total { font-weight: 900; font-size: 18px; }
        @media print { @page { size: 80mm auto; margin: 2mm; } }
      </style>
    </head>
    <body>
      <div class="receipt">
        <h1 class="center">PIZZARIA PRO</h1>
        <p class="center muted">Comanda de venda</p>
        <hr />
        <p><strong>Data:</strong> ${new Date(sale.data).toLocaleString('pt-BR')}</p>
        <p><strong>Tipo:</strong> ${sale.tipoVenda}</p>
        <p><strong>Cliente:</strong> ${sale.cliente || '-'}</p>
        ${sale.endereco ? `<p><strong>Endereço:</strong> ${sale.endereco}</p>` : ''}
        ${sale.telefone ? `<p><strong>Telefone:</strong> ${sale.telefone}</p>` : ''}
        <hr />
        <table>${lines}</table>
        <hr />
        <table>
          <tr><td>Pagamento</td><td class="right">${sale.pagamento}</td></tr>
          <tr><td class="total">TOTAL</td><td class="right total">${brl(sale.total)}</td></tr>
        </table>
        <hr />
        <p class="center muted">Obrigado pela preferência!</p>
      </div>
      <script>
        window.onload = () => {
          window.print();
          setTimeout(() => window.close(), 250);
        };
      </script>
    </body>
  </html>`;

  const printWindow = window.open('', '_blank', 'width=420,height=640');
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-up.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
}

function closeTable(tableId) {
  const table = db.mesasAbertas.find((m) => m.id === tableId);
  if (!table) return;

  const sale = {
    id: crypto.randomUUID(),
    data: now().toISOString(),
    tipoVenda: 'Mesa',
    cliente: table.cliente || `Mesa ${table.numeroMesa}`,
    endereco: '',
    telefone: '',
    itens: structuredClone(table.itens),
    pagamento: table.pagamento,
    total: table.total
  };

  registerSale(sale);
  printSaleReceipt(sale);
  db.mesasAbertas = db.mesasAbertas.filter((m) => m.id !== tableId);
  save();
  renderOpenTables();
  renderHistory();
}

function bindHistory() {
  el('close-cash').addEventListener('click', () => {
    if (!db.caixa?.aberto) return alert('Não há caixa aberto.');
    db.caixa.aberto = false;
    db.caixa.horaFechamento = now().toISOString();
    save();
    refreshAll();
    alert('Caixa fechado. Vendas bloqueadas até nova abertura.');
  });
}

function renderList(id, items, formatter) {
  el(id).innerHTML = items.map((x) => `<li>${formatter(x)}</li>`).join('') || '<li>Nenhum item.</li>';
}

function renderOrder() {
  el('order-items').innerHTML = session.carrinho.map((x, index) => {
    const pizzaInfo = x.tamanho ? ` (${x.tamanho})` : '';
    return `<li>
      ${x.qtd}x ${x.nome}${pizzaInfo}${x.borda ? ` | ${x.borda}` : ''}${x.adicional ? ` | ${x.adicional}` : ''} = ${brl(x.total)}
      <button type="button" data-order-action="edit" data-index="${index}">Editar</button>
      <button type="button" class="danger" data-order-action="remove" data-index="${index}">Excluir</button>
    </li>`;
  }).join('') || '<li>Nenhum item.</li>';
  const total = session.carrinho.reduce((s, i) => s + i.total, 0);
  el('order-total').textContent = brl(total);
}

function getRegisterCollection(type) {
  const map = {
    pizzas: db.produtos.pizzas,
    adicionais: db.produtos.adicionais,
    bordas: db.produtos.bordas,
    bebidas: db.produtos.bebidas
  };
  return map[type];
}

function deleteRegisteredItem(type, id) {
  const list = getRegisterCollection(type);
  if (!list) return;
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return;
  if (!confirm('Deseja excluir este item?')) return;
  list.splice(index, 1);
  save();
  refreshAll();
}

function editRegisteredItem(type, id) {
  const list = getRegisterCollection(type);
  const item = list?.find((x) => x.id === id);
  if (!item) return;

  if (type === 'pizzas') {
    const nome = prompt('Nome da pizza:', item.nome);
    const numero = Number(prompt('Número da pizza:', String(item.numero)));
    const broto = Number(prompt('Preço Broto:', String(item.broto)));
    const grande = Number(prompt('Preço Grande:', String(item.grande)));
    if (!nome || !numero || broto < 0 || grande < 0) return alert('Dados inválidos.');
    item.nome = nome.trim();
    item.numero = numero;
    item.broto = broto;
    item.grande = grande;
  }

  if (type === 'adicionais' || type === 'bordas') {
    const nome = prompt('Nome:', item.nome);
    const preco = Number(prompt('Preço:', String(item.preco)));
    if (!nome || preco < 0) return alert('Dados inválidos.');
    item.nome = nome.trim();
    item.preco = preco;
  }

  if (type === 'bebidas') {
    const nome = prompt('Nome da bebida:', item.nome);
    const tipo = prompt('Tipo da bebida:', item.tipo);
    const preco = Number(prompt('Preço:', String(item.preco)));
    if (!nome || !tipo || preco < 0) return alert('Dados inválidos.');
    item.nome = nome.trim();
    item.tipo = tipo.trim();
    item.preco = preco;
  }

  save();
  refreshAll();
}

function renderRegisterLists() {
  const withActions = (label, type, id) =>
    `${label}
      <button type="button" data-action="edit" data-type="${type}" data-id="${id}">Editar</button>
      <button type="button" class="danger" data-action="delete" data-type="${type}" data-id="${id}">Excluir</button>`;

  renderList('pizza-list', db.produtos.pizzas, (p) => withActions(`#${p.numero} ${p.nome} | Broto ${brl(p.broto)} | Grande ${brl(p.grande)}`, 'pizzas', p.id));
  renderList('extra-list', db.produtos.adicionais, (a) => withActions(`${a.nome} - ${brl(a.preco)}`, 'adicionais', a.id));
  renderList('edge-list', db.produtos.bordas, (b) => withActions(`${b.nome} - ${brl(b.preco)}`, 'bordas', b.id));
  renderList('drink-list', db.produtos.bebidas, (d) => withActions(`${d.nome} (${d.tipo}) - ${brl(d.preco)}`, 'bebidas', d.id));
}

function renderShortcutTutorial() {
  el('shortcut-list').innerHTML = SHORTCUTS.map((s) => `<li><strong>${s.combo}</strong> — ${s.action}</li>`).join('');
}

function renderOpenTables() {
  const wrap = el('open-tables-list');
  if (!db.mesasAbertas.length) {
    wrap.innerHTML = '<p>Nenhuma mesa aberta no momento.</p>';
    return;
  }

  wrap.innerHTML = db.mesasAbertas.map((mesa) => `
    <article class="table-card">
      <h3>Mesa ${mesa.numeroMesa}</h3>
      <p>Cliente: ${mesa.cliente}</p>
      <p>Aberta em: ${new Date(mesa.abertoEm).toLocaleString('pt-BR')}</p>
      <ul>
        ${mesa.itens.map((item) => `<li>${item.qtd}x ${item.nome}${item.tamanho ? ` (${item.tamanho})` : ''} - ${brl(item.total)}</li>`).join('')}
      </ul>
      <p><strong>Total: ${brl(mesa.total)}</strong></p>
      <p>Pagamento: ${mesa.pagamento}</p>
      <button type="button" class="danger" data-close-table="${mesa.id}">Fechar mesa</button>
    </article>
  `).join('');

  wrap.querySelectorAll('[data-close-table]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!db.caixa?.aberto) return alert('Abra o caixa para fechar mesa.');
      closeTable(btn.dataset.closeTable);
      alert('Mesa fechada com sucesso!');
    });
  });
}

function renderHistory() {
  if (!db.caixa) {
    el('history-summary').textContent = 'Sem caixa aberto/fechado ainda.';
    el('sales-history').innerHTML = '';
    return;
  }

  const c = db.caixa;
  const abertoEm = new Date(c.horaAbertura).toLocaleString('pt-BR');
  const fechadoEm = c.horaFechamento ? new Date(c.horaFechamento).toLocaleString('pt-BR') : 'Em aberto';
  el('history-summary').innerHTML = `
    <p>Data: ${new Date(c.data).toLocaleDateString('pt-BR')}</p>
    <p>Hora abertura: ${abertoEm}</p>
    <p>Hora fechamento: ${fechadoEm}</p>
    <p>Total vendas: ${brl(c.totalVendas)}</p>
    <p>Dinheiro: ${brl(c.pagamentos.Dinheiro)} | Cartão: ${brl(c.pagamentos.Cartão)} | Pix: ${brl(c.pagamentos.Pix)}</p>
    <p><strong>Total geral: ${brl(c.totalVendas + c.valorInicial)}</strong></p>`;

  renderList('sales-history', db.vendas.slice().reverse(), (v) => `${new Date(v.data).toLocaleString('pt-BR')} - ${v.tipoVenda} - ${v.cliente} - ${v.pagamento} - ${brl(v.total)}`);
}

function refreshAll() {
  fillDateTime();
  el('cash-status').textContent = db.caixa?.aberto ? 'Caixa aberto ✅' : 'Caixa fechado 🔒';
  renderRegisterLists();
  adjustSaleTypeFields();
  updateProductSelector();
  renderOrder();
  renderOpenTables();
  renderShortcutTutorial();
  renderHistory();
}

init();
