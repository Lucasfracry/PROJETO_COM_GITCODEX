const STORAGE_KEY = 'pdv_pizzaria_v1';

const defaultData = {
  users: [{ username: 'admin', password: '1234', role: 'Admin' }],
  caixa: null,
  produtos: {
    pizzas: [
      { id: crypto.randomUUID(), nome: 'Mussarela', categoria: 'Grande', preco: 45 },
      { id: crypto.randomUUID(), nome: 'Calabresa', categoria: 'Broto', preco: 30 }
    ],
    adicionais: [{ id: crypto.randomUUID(), nome: 'Catupiry', preco: 5 }],
    bordas: [
      { id: crypto.randomUUID(), nome: 'Sem borda', preco: 0 },
      { id: crypto.randomUUID(), nome: 'Borda de cheddar', preco: 8 }
    ],
    bebidas: [{ id: crypto.randomUUID(), nome: 'Coca-Cola 2L', tipo: 'Refrigerante', preco: 14 }]
  },
  vendas: []
};

let db = load();
let session = { user: null, carrinho: [] };

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
  bindHistory();
  fillDateTime();
  refreshAll();
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      el(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'history') renderHistory();
    });
  });
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
      nome: el('pizza-name').value,
      categoria: el('pizza-size').value,
      preco: Number(el('pizza-price').value)
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
  el('add-item').addEventListener('click', addOrderItem);
  el('cancel-order').addEventListener('click', () => { session.carrinho = []; renderOrder(); });
  el('sale-form').addEventListener('submit', finishSale);
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
  el('product-id').innerHTML = source.map((p) => `<option value="${p.id}">${p.nome} - ${brl(p.preco)}</option>`).join('');
  el('sale-edge').innerHTML = db.produtos.bordas.map((b) => `<option value="${b.id}">Borda: ${b.nome} (+${brl(b.preco)})</option>`).join('');
  el('sale-extra').innerHTML = `<option value="">Sem adicional</option>` + db.produtos.adicionais.map((a) => `<option value="${a.id}">Extra: ${a.nome} (+${brl(a.preco)})</option>`).join('');
  const pizzaOptions = type === 'pizza';
  el('sale-edge').disabled = !pizzaOptions;
  el('sale-extra').disabled = !pizzaOptions;
}

function addOrderItem() {
  if (!db.caixa?.aberto) return alert('Abra o caixa antes de vender.');
  const type = el('product-type').value;
  const qty = Number(el('product-qty').value) || 1;
  const source = type === 'pizza' ? db.produtos.pizzas : db.produtos.bebidas;
  const product = source.find((x) => x.id === el('product-id').value);
  if (!product) return;
  let totalUnit = Number(product.preco);
  const item = { tipo: type, nome: product.nome, qtd: qty, base: totalUnit, borda: null, adicional: null };

  if (type === 'pizza') {
    const borda = db.produtos.bordas.find((x) => x.id === el('sale-edge').value);
    const adicional = db.produtos.adicionais.find((x) => x.id === el('sale-extra').value);
    if (borda) { totalUnit += Number(borda.preco); item.borda = borda.nome; }
    if (adicional) { totalUnit += Number(adicional.preco); item.adicional = adicional.nome; }
  }
  item.total = totalUnit * qty;
  session.carrinho.push(item);
  renderOrder();
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
  const sale = {
    id: crypto.randomUUID(),
    data: now().toISOString(),
    tipoVenda: el('sale-type').value,
    cliente: el('customer-name').value || `Mesa ${el('table-number').value}`,
    endereco: el('customer-address').value || '',
    telefone: el('customer-phone').value || '',
    itens: structuredClone(session.carrinho),
    pagamento,
    total
  };
  db.vendas.push(sale);
  db.caixa.totalVendas += total;
  db.caixa.pagamentos[pagamento] += total;
  save();

  session.carrinho = [];
  e.target.reset();
  adjustSaleTypeFields();
  updateProductSelector();
  renderOrder();
  renderHistory();
  alert('Venda finalizada!');
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
  renderList('order-items', session.carrinho, (x) => `${x.qtd}x ${x.nome}${x.borda ? ` | ${x.borda}` : ''}${x.adicional ? ` | ${x.adicional}` : ''} = ${brl(x.total)}`);
  const total = session.carrinho.reduce((s, i) => s + i.total, 0);
  el('order-total').textContent = brl(total);
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
  renderList('pizza-list', db.produtos.pizzas, (p) => `${p.nome} (${p.categoria}) - ${brl(p.preco)}`);
  renderList('extra-list', db.produtos.adicionais, (a) => `${a.nome} - ${brl(a.preco)}`);
  renderList('edge-list', db.produtos.bordas, (b) => `${b.nome} - ${brl(b.preco)}`);
  renderList('drink-list', db.produtos.bebidas, (d) => `${d.nome} (${d.tipo}) - ${brl(d.preco)}`);
  adjustSaleTypeFields();
  updateProductSelector();
  renderOrder();
  renderHistory();
}

init();
