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
let sqliteEnginePromise = null;
const SHORTCUTS = [
  { combo: 'F2', action: 'Abrir aba PDV (Vendas)', detail: 'Leva direto para a tela principal de vendas.' },
  { combo: 'F3', action: 'Abrir aba Cadastro', detail: 'Acesso rápido para cadastrar pizzas, bordas, adicionais e bebidas.' },
  { combo: 'F4', action: 'Abrir aba Mesas Abertas', detail: 'Mostra todas as mesas com pedidos em aberto.' },
  { combo: 'F6', action: 'Abrir aba Tutorial', detail: 'Exibe esta tela com explicação completa dos atalhos.' },
  { combo: 'Alt + 1', action: 'Selecionar tipo Pizza no item', detail: 'No bloco “Itens do pedido”, define o produto como pizza.' },
  { combo: 'Alt + 2', action: 'Selecionar tipo Bebida no item', detail: 'No bloco “Itens do pedido”, altera o tipo para bebida.' },
  { combo: 'Alt + S', action: 'Ativar/Desativar Pizza 2 sabores', detail: 'Liga ou desliga a opção meio a meio na pizza atual.' },
  { combo: 'Alt + B', action: 'Selecionar tamanho Broto', detail: 'Define tamanho Broto para cálculo de preço.' },
  { combo: 'Alt + G', action: 'Selecionar tamanho Grande', detail: 'Define tamanho Grande para cálculo de preço.' },
  { combo: 'Ctrl + 1', action: 'Focar campo Tipo de item', detail: 'Posiciona o cursor no seletor Pizza/Bebida.' },
  { combo: 'Ctrl + 2', action: 'Focar campo Produto principal', detail: 'Foca no seletor do sabor/produto principal.' },
  { combo: 'Ctrl + 3', action: 'Focar segundo sabor', detail: 'Foca no segundo sabor quando pizza 2 sabores estiver ativa.' },
  { combo: 'Ctrl + 4', action: 'Focar quantidade do item', detail: 'Foca no campo de quantidade para digitação rápida.' },
  { combo: 'Ctrl + Enter', action: 'Adicionar item ao pedido', detail: 'Adiciona o item selecionado sem clicar no botão.' },
  { combo: 'Ctrl + Shift + Enter', action: 'Finalizar venda', detail: 'Envia o formulário de venda e fecha o pedido atual.' }
];

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : structuredClone(defaultData);
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function brl(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function now() { return new Date(); }
function getPizzaPrice(pizza, size) {
  const sizeValue = Number(pizza?.[size]);
  if (Number.isFinite(sizeValue) && sizeValue >= 0) return sizeValue;
  const legacyPrice = Number(pizza?.preco);
  return Number.isFinite(legacyPrice) ? legacyPrice : 0;
}

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
  bindSqliteImport();
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

function bindSqliteImport() {
  const form = el('sqlite-import-form');
  if (!form) return;
  form.addEventListener('submit', importSqliteFile);
}

async function getSqliteEngine() {
  if (sqliteEnginePromise) return sqliteEnginePromise;
  if (typeof window.initSqlJs !== 'function') {
    throw new Error('Biblioteca SQL.js não carregada.');
  }
  sqliteEnginePromise = window.initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`
  });
  return sqliteEnginePromise;
}

function hasTable(sqliteDb, tableName) {
  const rows = sqliteDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
  return rows.length > 0 && rows[0].values.length > 0;
}

function toRows(result) {
  if (!result?.length) return [];
  const [{ columns, values }] = result;
  return values.map((row) => Object.fromEntries(columns.map((col, idx) => [col, row[idx]])));
}

function mapImportedOrderType(orderType) {
  const normalized = String(orderType || '').toUpperCase();
  if (normalized === 'BALCAO') return 'Balcão';
  if (normalized === 'MESA') return 'Mesa';
  return 'Delivery';
}

function mapImportedPayment(payment) {
  const normalized = String(payment || '').toLowerCase();
  if (normalized.includes('dinheiro')) return 'Dinheiro';
  if (normalized.includes('pix')) return 'Pix';
  return 'Cartão';
}

function mergeUniqueByName(target, source, mapItem) {
  const existing = new Set(target.map((item) => item.nome.toLowerCase()));
  source.forEach((row) => {
    const mapped = mapItem(row);
    if (!mapped?.nome) return;
    const key = mapped.nome.toLowerCase();
    if (existing.has(key)) return;
    target.push(mapped);
    existing.add(key);
  });
}

async function importSqliteFile(e) {
  e.preventDefault();
  const status = el('sqlite-import-status');
  const fileInput = el('sqlite-file');
  const replaceData = el('sqlite-replace-data').checked;
  const file = fileInput.files?.[0];

  if (!file) {
    status.textContent = 'Selecione um arquivo SQLite antes de importar.';
    return;
  }

  status.textContent = 'Lendo banco SQLite...';

  try {
    const SQL = await getSqliteEngine();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sqliteDb = new SQL.Database(bytes);

    const importedState = replaceData
      ? { produtos: { pizzas: [], adicionais: [], bordas: [], bebidas: [] }, vendas: [] }
      : {
        produtos: {
          pizzas: structuredClone(db.produtos.pizzas),
          adicionais: structuredClone(db.produtos.adicionais),
          bordas: structuredClone(db.produtos.bordas),
          bebidas: structuredClone(db.produtos.bebidas)
        },
        vendas: structuredClone(db.vendas)
      };

    if (hasTable(sqliteDb, 'items')) {
      const rows = toRows(sqliteDb.exec('SELECT type, code, name, price_broto, price_grande, price, active FROM items'));
      mergeUniqueByName(importedState.produtos.pizzas, rows.filter((r) => r.type === 'pizza' && Number(r.active) !== 0), (r) => ({
        id: crypto.randomUUID(),
        numero: Number(r.code) || importedState.produtos.pizzas.length + 1,
        nome: String(r.name || '').trim(),
        broto: Number(r.price_broto ?? r.price ?? 0),
        grande: Number(r.price_grande ?? r.price ?? 0)
      }));
      mergeUniqueByName(importedState.produtos.bordas, rows.filter((r) => r.type === 'borda' && Number(r.active) !== 0), (r) => ({
        id: crypto.randomUUID(),
        nome: String(r.name || '').trim(),
        preco: Number(r.price ?? 0)
      }));
      mergeUniqueByName(importedState.produtos.bebidas, rows.filter((r) => r.type === 'outros' && Number(r.active) !== 0), (r) => ({
        id: crypto.randomUUID(),
        nome: String(r.name || '').trim(),
        tipo: 'Outros',
        preco: Number(r.price ?? 0)
      }));
    }

    if (hasTable(sqliteDb, 'pizzas')) {
      const rows = toRows(sqliteDb.exec('SELECT numero, nome, preco FROM pizzas'));
      mergeUniqueByName(importedState.produtos.pizzas, rows, (r) => ({
        id: crypto.randomUUID(),
        numero: Number(r.numero) || importedState.produtos.pizzas.length + 1,
        nome: String(r.nome || '').trim(),
        broto: Number(r.preco ?? 0),
        grande: Number(r.preco ?? 0)
      }));
    }

    if (hasTable(sqliteDb, 'bordas')) {
      const rows = toRows(sqliteDb.exec('SELECT nome, preco FROM bordas'));
      mergeUniqueByName(importedState.produtos.bordas, rows, (r) => ({
        id: crypto.randomUUID(),
        nome: String(r.nome || '').trim(),
        preco: Number(r.preco ?? 0)
      }));
    }

    if (hasTable(sqliteDb, 'orders')) {
      const orderRows = toRows(sqliteDb.exec('SELECT id, order_type, customer, payment, total, created_at FROM orders'));
      const itemRows = hasTable(sqliteDb, 'order_items')
        ? toRows(sqliteDb.exec('SELECT order_id, kind, description, qty, unit_price, total, meta_json FROM order_items'))
        : [];

      const orderItemsMap = new Map();
      itemRows.forEach((item) => {
        const list = orderItemsMap.get(item.order_id) || [];
        list.push({
          tipo: item.kind === 'meio_a_meio' ? 'pizza' : 'item',
          nome: String(item.description || 'Item'),
          qtd: Number(item.qty || 1),
          base: Number(item.unit_price || 0),
          total: Number(item.total || 0)
        });
        orderItemsMap.set(item.order_id, list);
      });

      const importedSales = orderRows.map((order) => ({
        id: crypto.randomUUID(),
        data: order.created_at ? new Date(String(order.created_at).replace(' ', 'T')).toISOString() : now().toISOString(),
        tipoVenda: mapImportedOrderType(order.order_type),
        cliente: String(order.customer || ''),
        endereco: '',
        telefone: '',
        itens: orderItemsMap.get(order.id) || [],
        pagamento: mapImportedPayment(order.payment),
        total: Number(order.total || 0)
      }));

      importedState.vendas.push(...importedSales);
    }

    db.produtos = importedState.produtos;
    db.vendas = importedState.vendas;
    save();
    refreshAll();
    status.textContent = `Importação concluída: ${db.produtos.pizzas.length} pizzas, ${db.produtos.bordas.length} bordas, ${db.produtos.bebidas.length} bebidas e ${db.vendas.length} vendas.`;
    fileInput.value = '';
  } catch (error) {
    status.textContent = `Falha ao importar SQLite: ${error.message}`;
  }
}

function bindSales() {
  el('sale-type').addEventListener('change', adjustSaleTypeFields);
  el('product-type').addEventListener('change', updateProductSelector);
  el('pizza-order-size').addEventListener('change', updateProductSelector);
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
  const selectedSize = el('pizza-order-size').value;

  if (type === 'pizza') {
    const labelSize = selectedSize === 'broto' ? 'Broto' : 'Grande';
    el('product-id').innerHTML = source.map((p) => `<option value="${p.id}">#${p.numero} ${p.nome} (${labelSize} ${brl(getPizzaPrice(p, selectedSize))})</option>`).join('');
    el('product-id-second').innerHTML = source.map((p) => `<option value="${p.id}">#${p.numero} ${p.nome} (${labelSize} ${brl(getPizzaPrice(p, selectedSize))})</option>`).join('');
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
    const firstPrice = getPizzaPrice(product, pizzaSize);
    const secondPrice = secondProduct ? getPizzaPrice(secondProduct, pizzaSize) : 0;
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
    const fechamentoEm = now().toISOString();
    const pedidosNoPeriodo = db.vendas.filter((v) => new Date(v.data) >= new Date(db.caixa.horaAbertura) && new Date(v.data) <= new Date(fechamentoEm));
    const resumoFechamento = {
      dataAbertura: db.caixa.horaAbertura,
      dataFechamento: fechamentoEm,
      trocoInicial: db.caixa.valorInicial,
      quantidadePedidos: pedidosNoPeriodo.length,
      totalVendas: db.caixa.totalVendas,
      pagamentos: structuredClone(db.caixa.pagamentos),
      totalFechamento: db.caixa.valorInicial + db.caixa.totalVendas
    };
    db.caixa.aberto = false;
    db.caixa.horaFechamento = fechamentoEm;
    save();
    printCashCloseReport(resumoFechamento);
    refreshAll();
    alert('Caixa fechado. Vendas bloqueadas até nova abertura.');
  });
}

function printCashCloseReport(resumo) {
  const content = `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Fechamento de Caixa</title>
      <style>
        body { font-family: 'Courier New', monospace; margin: 0; color: #000; font-size: 16px; font-weight: 800; }
        .receipt { width: 72mm; margin: 0 auto; padding: 3mm; }
        h1, p { margin: 0; font-weight: 800; }
        .center { text-align: center; }
        .muted { font-size: 14px; margin-top: 2px; }
        hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 15px; }
        td { vertical-align: top; padding: 3px 0; }
        .right { text-align: right; white-space: nowrap; }
        .total { font-size: 18px; font-weight: 900; }
        @media print { @page { size: 80mm auto; margin: 2mm; } }
      </style>
    </head>
    <body>
      <div class="receipt">
        <h1 class="center">FECHAMENTO DE CAIXA</h1>
        <p class="center muted">PDV Pizzaria Pro</p>
        <hr />
        <p><strong>Abertura:</strong> ${new Date(resumo.dataAbertura).toLocaleString('pt-BR')}</p>
        <p><strong>Fechamento:</strong> ${new Date(resumo.dataFechamento).toLocaleString('pt-BR')}</p>
        <hr />
        <table>
          <tr><td>Troco inicial</td><td class="right">${brl(resumo.trocoInicial)}</td></tr>
          <tr><td>Pedidos feitos</td><td class="right">${resumo.quantidadePedidos}</td></tr>
          <tr><td>Total de vendas</td><td class="right">${brl(resumo.totalVendas)}</td></tr>
          <tr><td>Dinheiro</td><td class="right">${brl(resumo.pagamentos.Dinheiro)}</td></tr>
          <tr><td>Cartão</td><td class="right">${brl(resumo.pagamentos.Cartão)}</td></tr>
          <tr><td>Pix</td><td class="right">${brl(resumo.pagamentos.Pix)}</td></tr>
        </table>
        <hr />
        <table>
          <tr><td class="total">TOTAL FECHAMENTO</td><td class="right total">${brl(resumo.totalFechamento)}</td></tr>
        </table>
        <hr />
        <p class="center muted">Fechamento calculado automaticamente</p>
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
    alert('Não foi possível abrir a janela de impressão do fechamento.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
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

  renderList('pizza-list', db.produtos.pizzas, (p) => withActions(`#${p.numero} ${p.nome} | Broto ${brl(getPizzaPrice(p, 'broto'))} | Grande ${brl(getPizzaPrice(p, 'grande'))}`, 'pizzas', p.id));
  renderList('extra-list', db.produtos.adicionais, (a) => withActions(`${a.nome} - ${brl(a.preco)}`, 'adicionais', a.id));
  renderList('edge-list', db.produtos.bordas, (b) => withActions(`${b.nome} - ${brl(b.preco)}`, 'bordas', b.id));
  renderList('drink-list', db.produtos.bebidas, (d) => withActions(`${d.nome} (${d.tipo}) - ${brl(d.preco)}`, 'bebidas', d.id));
}

function renderShortcutTutorial() {
  el('shortcut-list').innerHTML = SHORTCUTS.map((s) => `
    <li class="shortcut-item">
      <strong>${s.combo}</strong>
      <span>${s.action}</span>
      <small>${s.detail}</small>
    </li>
  `).join('');
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
