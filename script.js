let atendimentoAtual = null;
let tamanhoSelecionado = "broto";
let pizzaSelecionada = null;
let categoriaProdutoAtual = "pizzas";
let carrinho = [];
let pedidos = [];
let comandas = [];
let comandaSelecionada = null;

let editandoPizza = null;
let editandoBebida = null;

let pizzas = [
  {
    numero: 1,
    nome: "Mussarela",
    descricao: "Mussarela, tomate, orégano e azeitona",
    preco_broto: 35,
    preco_grande: 55
  },
  {
    numero: 2,
    nome: "Calabresa",
    descricao: "Calabresa, cebola, mussarela e orégano",
    preco_broto: 36,
    preco_grande: 58
  },
  {
    numero: 3,
    nome: "Frango com Catupiry",
    descricao: "Frango desfiado, catupiry, mussarela e orégano",
    preco_broto: 39,
    preco_grande: 62
  },
  {
    numero: 4,
    nome: "Portuguesa",
    descricao: "Presunto, ovo, cebola, ervilha, mussarela e azeitona",
    preco_broto: 40,
    preco_grande: 65
  }
];

let bebidas = [
  {
    codigo: 101,
    nome: "Coca-Cola lata",
    categoria: "Refrigerante",
    preco: 7
  },
  {
    codigo: 102,
    nome: "Guaraná lata",
    categoria: "Refrigerante",
    preco: 7
  },
  {
    codigo: 103,
    nome: "Água sem gás",
    categoria: "Água",
    preco: 4
  },
  {
    codigo: 104,
    nome: "Água com gás",
    categoria: "Água",
    preco: 5
  }
];

function dinheiro(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* PÁGINAS */

function abrirPagina(pagina, botao) {
  document.querySelectorAll(".page").forEach(secao => {
    secao.classList.remove("active");
  });

  document.getElementById(pagina).classList.add("active");

  document.querySelectorAll(".menu button").forEach(btn => {
    btn.classList.remove("active");
  });

  botao.classList.add("active");

  const nomes = {
    pdv: "PDV",
    pedidos: "Pedidos",
    cardapio: "Cardápio",
    relatorio: "Relatório",
    config: "Configurações"
  };

  const subtitulos = {
    pdv: "Escolha o tipo de atendimento para iniciar o pedido.",
    pedidos: "Veja os pedidos finalizados.",
    cardapio: "Cadastre e gerencie pizzas e bebidas.",
    relatorio: "Resumo das vendas.",
    config: "Configurações do sistema."
  };

  document.getElementById("tituloPagina").textContent = nomes[pagina];
  document.getElementById("subtituloPagina").textContent = subtitulos[pagina];

  atualizarTelas();
}

/* ATENDIMENTO */

function selecionarAtendimento(tipo) {
  atendimentoAtual = tipo;
  carrinho = [];
  pizzaSelecionada = null;
  comandaSelecionada = null;
  categoriaProdutoAtual = "pizzas";

  document.getElementById("selecaoAtendimento").classList.add("hidden");
  document.getElementById("areaPedido").classList.remove("hidden");

  document.getElementById("formDelivery").classList.add("hidden");
  document.getElementById("formSalao").classList.add("hidden");
  document.getElementById("formBalcao").classList.add("hidden");
  document.getElementById("montagemPedido").classList.add("hidden");

  if (tipo === "delivery") {
    document.getElementById("tituloAtendimento").textContent = "Novo Delivery";
    document.getElementById("descricaoAtendimento").textContent = "Informe os dados do cliente e monte o pedido.";
    document.getElementById("formDelivery").classList.remove("hidden");
    document.getElementById("montagemPedido").classList.remove("hidden");
  }

  if (tipo === "salao") {
    document.getElementById("tituloAtendimento").textContent = "Atendimento Salão";
    document.getElementById("descricaoAtendimento").textContent = "Abra ou selecione uma comanda para adicionar consumo.";
    document.getElementById("formSalao").classList.remove("hidden");
  }

  if (tipo === "balcao") {
    document.getElementById("tituloAtendimento").textContent = "Pedido Balcão";
    document.getElementById("descricaoAtendimento").textContent = "Informe o nome do cliente e monte o pedido.";
    document.getElementById("formBalcao").classList.remove("hidden");
    document.getElementById("montagemPedido").classList.remove("hidden");
  }

  limparTelaPedido();
  atualizarAbasProduto();
  atualizarTelas();
}

function voltarSelecaoAtendimento() {
  atendimentoAtual = null;
  carrinho = [];
  pizzaSelecionada = null;
  comandaSelecionada = null;
  categoriaProdutoAtual = "pizzas";

  document.getElementById("selecaoAtendimento").classList.remove("hidden");
  document.getElementById("areaPedido").classList.add("hidden");

  limparTelaPedido();
  atualizarTelas();
}

function limparTelaPedido() {
  document.getElementById("pizzaSelecionadaTexto").textContent = "Nenhuma pizza";
  document.getElementById("pizzaSelecionadaInput").value = "";
  document.getElementById("observacao").value = "";
  document.getElementById("quantidade").value = 1;
  document.getElementById("tipoPizza").value = "inteira";

  selecionarTamanho("broto");
  atualizarTipoPizza();
  renderizarCarrinho();
}

/* PRODUTOS */

function renderizarProdutos() {
  const lista = document.getElementById("listaProdutos");
  const busca = document.getElementById("buscaProduto")?.value.toLowerCase() || "";

  if (!lista) return;

  lista.innerHTML = "";

  if (categoriaProdutoAtual === "pizzas") {
    const filtradas = pizzas.filter(pizza => {
      return (
        pizza.nome.toLowerCase().includes(busca) ||
        String(pizza.numero).includes(busca)
      );
    });

    if (filtradas.length === 0) {
      lista.innerHTML = `<p style="color:#6b7280;">Nenhuma pizza encontrada.</p>`;
      return;
    }

    filtradas.forEach(pizza => {
      const div = document.createElement("div");
      div.className = "produto";

      if (pizzaSelecionada && pizzaSelecionada.numero === pizza.numero) {
        div.classList.add("selecionado");
      }

      div.onclick = () => selecionarPizza(pizza.numero);

      div.innerHTML = `
        <div class="produto-numero">${pizza.numero}</div>
        <h4>${pizza.nome}</h4>
        <p>${pizza.descricao || ""}</p>

        <div class="precos">
          <span>Broto: <strong>${dinheiro(pizza.preco_broto)}</strong></span>
          <span>Grande: <strong>${dinheiro(pizza.preco_grande)}</strong></span>
        </div>
      `;

      lista.appendChild(div);
    });
  }

  if (categoriaProdutoAtual === "bebidas") {
    const filtradas = bebidas.filter(bebida => {
      return (
        bebida.nome.toLowerCase().includes(busca) ||
        bebida.categoria.toLowerCase().includes(busca) ||
        String(bebida.codigo).includes(busca)
      );
    });

    if (filtradas.length === 0) {
      lista.innerHTML = `<p style="color:#6b7280;">Nenhuma bebida encontrada.</p>`;
      return;
    }

    filtradas.forEach(bebida => {
      const div = document.createElement("div");
      div.className = "produto produto-bebida";

      div.onclick = () => adicionarBebidaAoCarrinho(bebida.codigo);

      div.innerHTML = `
        <div class="produto-numero">${bebida.codigo}</div>
        <h4>${bebida.nome}</h4>
        <p>${bebida.categoria}</p>

        <div class="preco-bebida">
          ${dinheiro(bebida.preco)}
        </div>
      `;

      lista.appendChild(div);
    });
  }
}

function trocarCategoriaProduto(categoria) {
  categoriaProdutoAtual = categoria;
  atualizarAbasProduto();

  const buscaProduto = document.getElementById("buscaProduto");

  if (buscaProduto) {
    buscaProduto.value = "";

    if (categoria === "pizzas") {
      buscaProduto.placeholder = "Buscar por número ou nome da pizza...";
    }

    if (categoria === "bebidas") {
      buscaProduto.placeholder = "Buscar por código, nome ou categoria da bebida...";
    }
  }

  renderizarProdutos();
}

function atualizarAbasProduto() {
  const tabPizzas = document.getElementById("tabPizzas");
  const tabBebidas = document.getElementById("tabBebidas");

  if (!tabPizzas || !tabBebidas) return;

  tabPizzas.classList.remove("active");
  tabBebidas.classList.remove("active");

  if (categoriaProdutoAtual === "pizzas") {
    tabPizzas.classList.add("active");
  }

  if (categoriaProdutoAtual === "bebidas") {
    tabBebidas.classList.add("active");
  }
}

function selecionarPizza(numero) {
  pizzaSelecionada = pizzas.find(pizza => pizza.numero === numero);

  document.getElementById("pizzaSelecionadaTexto").textContent = pizzaSelecionada.nome;
  document.getElementById("pizzaSelecionadaInput").value = pizzaSelecionada.nome;

  renderizarProdutos();
}

function selecionarTamanho(tamanho) {
  tamanhoSelecionado = tamanho;

  document.getElementById("btnBroto").classList.remove("active");
  document.getElementById("btnGrande").classList.remove("active");

  if (tamanho === "broto") {
    document.getElementById("btnBroto").classList.add("active");
  }

  if (tamanho === "grande") {
    document.getElementById("btnGrande").classList.add("active");
  }
}

function atualizarTipoPizza() {
  const tipo = document.getElementById("tipoPizza").value;
  const pizzaInteiraBox = document.getElementById("pizzaInteiraBox");
  const meioMeioBox = document.getElementById("meioMeioBox");

  if (tipo === "meio") {
    pizzaInteiraBox.style.display = "none";
    meioMeioBox.style.display = "flex";
  } else {
    pizzaInteiraBox.style.display = "flex";
    meioMeioBox.style.display = "none";
  }

  preencherSaboresMeioMeio();
}

function preencherSaboresMeioMeio() {
  const sabor1 = document.getElementById("sabor1");
  const sabor2 = document.getElementById("sabor2");

  if (!sabor1 || !sabor2) return;

  sabor1.innerHTML = "";
  sabor2.innerHTML = "";

  pizzas.forEach(pizza => {
    const option1 = document.createElement("option");
    option1.value = pizza.numero;
    option1.textContent = `${pizza.numero} - ${pizza.nome}`;

    const option2 = document.createElement("option");
    option2.value = pizza.numero;
    option2.textContent = `${pizza.numero} - ${pizza.nome}`;

    sabor1.appendChild(option1);
    sabor2.appendChild(option2);
  });
}

function pegarPrecoPizza(pizza) {
  if (tamanhoSelecionado === "broto") {
    return pizza.preco_broto;
  }

  return pizza.preco_grande;
}

/* CARRINHO */

function adicionarAoCarrinho() {
  if (atendimentoAtual === "salao" && !comandaSelecionada) {
    alert("Abra ou selecione uma comanda antes de adicionar itens.");
    return;
  }

  const tipo = document.getElementById("tipoPizza").value;
  const quantidade = Number(document.getElementById("quantidade").value);
  const observacao = document.getElementById("observacao").value.trim();

  if (quantidade <= 0) {
    alert("Informe uma quantidade válida.");
    return;
  }

  let item = null;

  if (tipo === "inteira") {
    if (!pizzaSelecionada) {
      alert("Selecione uma pizza do cardápio.");
      return;
    }

    const precoUnitario = pegarPrecoPizza(pizzaSelecionada);

    item = {
      nome: pizzaSelecionada.nome,
      tipo: "Pizza inteira",
      tamanho: tamanhoSelecionado,
      quantidade,
      precoUnitario,
      total: precoUnitario * quantidade,
      observacao
    };
  }

  if (tipo === "meio") {
    const numero1 = Number(document.getElementById("sabor1").value);
    const numero2 = Number(document.getElementById("sabor2").value);

    const pizza1 = pizzas.find(pizza => pizza.numero === numero1);
    const pizza2 = pizzas.find(pizza => pizza.numero === numero2);

    const preco1 = pegarPrecoPizza(pizza1);
    const preco2 = pegarPrecoPizza(pizza2);
    const precoUnitario = Math.max(preco1, preco2);

    item = {
      nome: `Meio a meio: ${pizza1.nome} / ${pizza2.nome}`,
      tipo: "Pizza meio a meio",
      tamanho: tamanhoSelecionado,
      quantidade,
      precoUnitario,
      total: precoUnitario * quantidade,
      observacao
    };
  }

  inserirItemNoPedido(item);

  document.getElementById("observacao").value = "";
  document.getElementById("quantidade").value = 1;

  renderizarCarrinho();
  renderizarComandas();
}

function adicionarBebidaAoCarrinho(codigo) {
  if (atendimentoAtual === "salao" && !comandaSelecionada) {
    alert("Abra ou selecione uma comanda antes de adicionar bebidas.");
    return;
  }

  if (!atendimentoAtual) {
    alert("Selecione Delivery, Salão ou Balcão antes de adicionar bebidas.");
    return;
  }

  const bebida = bebidas.find(item => item.codigo === codigo);

  if (!bebida) {
    alert("Bebida não encontrada.");
    return;
  }

  const item = {
    nome: bebida.nome,
    tipo: "Bebida",
    tamanho: bebida.categoria,
    quantidade: 1,
    precoUnitario: bebida.preco,
    total: bebida.preco,
    observacao: ""
  };

  inserirItemNoPedido(item);
  renderizarCarrinho();
  renderizarComandas();
}

function inserirItemNoPedido(item) {
  if (atendimentoAtual === "salao") {
    comandaSelecionada.itens.push(item);
    carrinho = [...comandaSelecionada.itens];
  } else {
    carrinho.push(item);
  }
}

function renderizarCarrinho() {
  const divCarrinho = document.getElementById("carrinho");
  const totalPedido = document.getElementById("totalPedido");

  if (!divCarrinho || !totalPedido) return;

  divCarrinho.innerHTML = "";

  let total = 0;

  if (carrinho.length === 0) {
    divCarrinho.innerHTML = `<p style="color:#6b7280;">Nenhum item adicionado.</p>`;
  }

  carrinho.forEach((item, index) => {
    total += item.total;

    const div = document.createElement("div");
    div.className = "item-carrinho";

    let detalhe = "";

    if (item.tipo === "Bebida") {
      detalhe = `${item.quantidade}x ${item.tamanho} - ${dinheiro(item.precoUnitario)}`;
    } else {
      detalhe = `${item.quantidade}x ${item.tamanho.toUpperCase()} - ${dinheiro(item.precoUnitario)}`;
    }

    div.innerHTML = `
      <div>
        <h4>${item.nome}</h4>
        <p>${item.tipo}</p>
        <p>${detalhe}</p>
        ${item.observacao ? `<p>Obs: ${item.observacao}</p>` : ""}
        <strong>${dinheiro(item.total)}</strong>
      </div>

      <button onclick="removerItemCarrinho(${index})">X</button>
    `;

    divCarrinho.appendChild(div);
  });

  totalPedido.textContent = dinheiro(total);
}

function removerItemCarrinho(index) {
  carrinho.splice(index, 1);

  if (atendimentoAtual === "salao" && comandaSelecionada) {
    comandaSelecionada.itens = [...carrinho];
  }

  renderizarCarrinho();
  renderizarComandas();
}

function limparCarrinho() {
  carrinho = [];

  if (atendimentoAtual === "salao" && comandaSelecionada) {
    comandaSelecionada.itens = [];
  }

  renderizarCarrinho();
  renderizarComandas();
}

/* SALÃO / COMANDAS */

function abrirOuSelecionarComanda() {
  const mesa = Number(document.getElementById("salaoMesa").value);
  const nome = document.getElementById("salaoNome").value.trim();

  if (!mesa) {
    alert("Informe o número da mesa.");
    return;
  }

  let comanda = comandas.find(item => item.mesa === mesa && item.status === "Aberta");

  if (!comanda) {
    comanda = {
      id: Date.now(),
      mesa,
      nome: nome || `Mesa ${mesa}`,
      itens: [],
      status: "Aberta"
    };

    comandas.push(comanda);
  }

  selecionarComanda(comanda.id);
}

function selecionarComanda(id) {
  comandaSelecionada = comandas.find(comanda => comanda.id === id);
  carrinho = [...comandaSelecionada.itens];

  document.getElementById("montagemPedido").classList.remove("hidden");
  document.getElementById("tituloAtendimento").textContent = `Mesa ${comandaSelecionada.mesa}`;
  document.getElementById("descricaoAtendimento").textContent = `Comanda aberta: ${comandaSelecionada.nome}`;

  renderizarCarrinho();
  renderizarComandas();
}

function renderizarComandas() {
  const lista = document.getElementById("listaComandas");

  if (!lista) return;

  lista.innerHTML = "";

  const abertas = comandas.filter(comanda => comanda.status === "Aberta");

  if (abertas.length === 0) {
    lista.innerHTML = `<p style="color:#6b7280;">Nenhuma comanda aberta.</p>`;
    return;
  }

  abertas.forEach(comanda => {
    const total = comanda.itens.reduce((soma, item) => soma + item.total, 0);

    const div = document.createElement("div");
    div.className = "comanda-card";

    if (comandaSelecionada && comandaSelecionada.id === comanda.id) {
      div.classList.add("active");
    }

    div.onclick = () => selecionarComanda(comanda.id);

    div.innerHTML = `
      <strong>Mesa ${comanda.mesa}</strong>
      <span>${comanda.nome}</span><br>
      <span>${comanda.itens.length} item(ns)</span><br>
      <strong>${dinheiro(total)}</strong>
    `;

    lista.appendChild(div);
  });
}

/* FINALIZAR */

function finalizarPedido() {
  if (!atendimentoAtual) {
    alert("Selecione um tipo de atendimento.");
    return;
  }

  if (carrinho.length === 0) {
    alert("O pedido está vazio.");
    return;
  }

  let cliente = "";
  let endereco = "";
  let telefone = "";

  if (atendimentoAtual === "delivery") {
    cliente = document.getElementById("deliveryNome").value.trim();
    telefone = document.getElementById("deliveryTelefone").value.trim();
    endereco = document.getElementById("deliveryEndereco").value.trim();

    if (!cliente || !telefone || !endereco) {
      alert("Preencha nome, telefone e endereço do delivery.");
      return;
    }
  }

  if (atendimentoAtual === "balcao") {
    cliente = document.getElementById("balcaoNome").value.trim();

    if (!cliente) {
      alert("Informe o nome do cliente.");
      return;
    }
  }

  if (atendimentoAtual === "salao") {
    if (!comandaSelecionada) {
      alert("Selecione uma comanda.");
      return;
    }

    cliente = `Mesa ${comandaSelecionada.mesa} - ${comandaSelecionada.nome}`;
  }

  const pagamento = document.getElementById("pagamento").value;
  const total = carrinho.reduce((soma, item) => soma + item.total, 0);

  const pedido = {
    numero: pedidos.length + 1,
    tipo: atendimentoAtual,
    cliente,
    telefone,
    endereco,
    itens: [...carrinho],
    pagamento,
    total,
    status: "Finalizado"
  };

  pedidos.push(pedido);

  if (atendimentoAtual === "salao" && comandaSelecionada) {
    comandaSelecionada.status = "Finalizada";
  }

  alert("Pedido finalizado com sucesso!");

  limparDadosAtendimento();
  voltarSelecaoAtendimento();
  atualizarTelas();
}

function limparDadosAtendimento() {
  const deliveryNome = document.getElementById("deliveryNome");
  const deliveryTelefone = document.getElementById("deliveryTelefone");
  const deliveryEndereco = document.getElementById("deliveryEndereco");
  const balcaoNome = document.getElementById("balcaoNome");
  const salaoMesa = document.getElementById("salaoMesa");
  const salaoNome = document.getElementById("salaoNome");

  if (deliveryNome) deliveryNome.value = "";
  if (deliveryTelefone) deliveryTelefone.value = "";
  if (deliveryEndereco) deliveryEndereco.value = "";
  if (balcaoNome) balcaoNome.value = "";
  if (salaoMesa) salaoMesa.value = "";
  if (salaoNome) salaoNome.value = "";
}

/* CARDÁPIO DE PIZZAS */

function cadastrarPizza() {
  const numero = Number(document.getElementById("cadNumero").value);
  const nome = document.getElementById("cadNome").value.trim();
  const precoBroto = Number(document.getElementById("cadBroto").value);
  const precoGrande = Number(document.getElementById("cadGrande").value);
  const descricao = document.getElementById("cadDescricao").value.trim();

  if (!numero || !nome || !precoBroto || !precoGrande) {
    alert("Preencha número, nome, preço broto e preço grande.");
    return;
  }

  const numeroExiste = pizzas.some(pizza => pizza.numero === numero);

  if (numeroExiste) {
    alert("Já existe uma pizza cadastrada com esse número.");
    return;
  }

  pizzas.push({
    numero,
    nome,
    descricao,
    preco_broto: precoBroto,
    preco_grande: precoGrande
  });

  limparFormularioCadastro();
  atualizarTelas();

  alert("Pizza cadastrada com sucesso!");
}

function limparFormularioCadastro() {
  document.getElementById("cadNumero").value = "";
  document.getElementById("cadNome").value = "";
  document.getElementById("cadBroto").value = "";
  document.getElementById("cadGrande").value = "";
  document.getElementById("cadDescricao").value = "";
}

function editarPizza(numero) {
  editandoPizza = numero;
  renderizarCardapio();
}

function cancelarEdicaoPizza() {
  editandoPizza = null;
  renderizarCardapio();
}

function salvarEdicaoPizza(numero) {
  const pizza = pizzas.find(item => item.numero === numero);

  if (!pizza) {
    alert("Pizza não encontrada.");
    return;
  }

  const nome = document.getElementById(`editPizzaNome_${numero}`).value.trim();
  const descricao = document.getElementById(`editPizzaDescricao_${numero}`).value.trim();
  const precoBroto = Number(document.getElementById(`editPizzaBroto_${numero}`).value);
  const precoGrande = Number(document.getElementById(`editPizzaGrande_${numero}`).value);

  if (!nome || !precoBroto || !precoGrande) {
    alert("Preencha nome, preço broto e preço grande.");
    return;
  }

  pizza.nome = nome;
  pizza.descricao = descricao;
  pizza.preco_broto = precoBroto;
  pizza.preco_grande = precoGrande;

  if (pizzaSelecionada && pizzaSelecionada.numero === numero) {
    pizzaSelecionada = pizza;
    document.getElementById("pizzaSelecionadaTexto").textContent = pizza.nome;
    document.getElementById("pizzaSelecionadaInput").value = pizza.nome;
  }

  editandoPizza = null;
  atualizarTelas();

  alert("Pizza alterada com sucesso!");
}

function excluirPizza(numero) {
  const confirmar = confirm("Deseja excluir esta pizza?");

  if (!confirmar) return;

  pizzas = pizzas.filter(pizza => pizza.numero !== numero);

  if (pizzaSelecionada && pizzaSelecionada.numero === numero) {
    pizzaSelecionada = null;
    document.getElementById("pizzaSelecionadaTexto").textContent = "Nenhuma pizza";
    document.getElementById("pizzaSelecionadaInput").value = "";
  }

  atualizarTelas();
}

function renderizarCardapio() {
  const tabela = document.getElementById("tabelaCardapio");
  const qtd = document.getElementById("qtdPizzasTexto");

  if (!tabela || !qtd) return;

  tabela.innerHTML = "";

  pizzas.forEach(pizza => {
    const tr = document.createElement("tr");

    if (editandoPizza === pizza.numero) {
      tr.innerHTML = `
        <td>${pizza.numero}</td>

        <td>
          <div class="campo">
            <label>Nome</label>
            <input id="editPizzaNome_${pizza.numero}" type="text" value="${pizza.nome}">
          </div>

          <div class="campo" style="margin-top:8px;">
            <label>Descrição</label>
            <input id="editPizzaDescricao_${pizza.numero}" type="text" value="${pizza.descricao || ""}">
          </div>
        </td>

        <td>
          <input
            id="editPizzaBroto_${pizza.numero}"
            type="number"
            step="0.01"
            value="${pizza.preco_broto}"
            style="width:110px; padding:10px; border:1px solid #e5e7eb; border-radius:10px;"
          >
        </td>

        <td>
          <input
            id="editPizzaGrande_${pizza.numero}"
            type="number"
            step="0.01"
            value="${pizza.preco_grande}"
            style="width:110px; padding:10px; border:1px solid #e5e7eb; border-radius:10px;"
          >
        </td>

        <td>
          <button class="btn btn-green" onclick="salvarEdicaoPizza(${pizza.numero})">
            Salvar
          </button>

          <button class="btn btn-gray" onclick="cancelarEdicaoPizza()" style="margin-top:8px;">
            Cancelar
          </button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td>${pizza.numero}</td>

        <td>
          <strong>${pizza.nome}</strong><br>
          <small>${pizza.descricao || ""}</small>
        </td>

        <td>${dinheiro(pizza.preco_broto)}</td>
        <td>${dinheiro(pizza.preco_grande)}</td>

        <td>
          <button class="btn btn-dark" onclick="editarPizza(${pizza.numero})">
            Editar
          </button>

          <button class="btn btn-gray" onclick="excluirPizza(${pizza.numero})" style="margin-top:8px;">
            Excluir
          </button>
        </td>
      `;
    }

    tabela.appendChild(tr);
  });

  qtd.textContent = `${pizzas.length} pizzas`;
}

/* CARDÁPIO DE BEBIDAS */

function cadastrarBebida() {
  const codigo = Number(document.getElementById("bebCodigo").value);
  const nome = document.getElementById("bebNome").value.trim();
  const preco = Number(document.getElementById("bebPreco").value);
  const categoria = document.getElementById("bebCategoria").value.trim();

  if (!codigo || !nome || !preco || !categoria) {
    alert("Preencha código, nome, preço e categoria da bebida.");
    return;
  }

  const codigoExiste = bebidas.some(bebida => bebida.codigo === codigo);

  if (codigoExiste) {
    alert("Já existe uma bebida cadastrada com esse código.");
    return;
  }

  bebidas.push({
    codigo,
    nome,
    categoria,
    preco
  });

  limparFormularioBebida();
  atualizarTelas();

  alert("Bebida cadastrada com sucesso!");
}

function limparFormularioBebida() {
  document.getElementById("bebCodigo").value = "";
  document.getElementById("bebNome").value = "";
  document.getElementById("bebPreco").value = "";
  document.getElementById("bebCategoria").value = "";
}

function editarBebida(codigo) {
  editandoBebida = codigo;
  renderizarBebidas();
}

function cancelarEdicaoBebida() {
  editandoBebida = null;
  renderizarBebidas();
}

function salvarEdicaoBebida(codigo) {
  const bebida = bebidas.find(item => item.codigo === codigo);

  if (!bebida) {
    alert("Bebida não encontrada.");
    return;
  }

  const nome = document.getElementById(`editBebidaNome_${codigo}`).value.trim();
  const categoria = document.getElementById(`editBebidaCategoria_${codigo}`).value.trim();
  const preco = Number(document.getElementById(`editBebidaPreco_${codigo}`).value);

  if (!nome || !categoria || !preco) {
    alert("Preencha nome, categoria e preço da bebida.");
    return;
  }

  bebida.nome = nome;
  bebida.categoria = categoria;
  bebida.preco = preco;

  editandoBebida = null;
  atualizarTelas();

  alert("Bebida alterada com sucesso!");
}

function excluirBebida(codigo) {
  const confirmar = confirm("Deseja excluir esta bebida?");

  if (!confirmar) return;

  bebidas = bebidas.filter(bebida => bebida.codigo !== codigo);
  atualizarTelas();
}

function renderizarBebidas() {
  const tabela = document.getElementById("tabelaBebidas");
  const qtd = document.getElementById("qtdBebidasTexto");

  if (!tabela || !qtd) return;

  tabela.innerHTML = "";

  bebidas.forEach(bebida => {
    const tr = document.createElement("tr");

    if (editandoBebida === bebida.codigo) {
      tr.innerHTML = `
        <td>${bebida.codigo}</td>

        <td>
          <input
            id="editBebidaNome_${bebida.codigo}"
            type="text"
            value="${bebida.nome}"
            style="width:180px; padding:10px; border:1px solid #e5e7eb; border-radius:10px;"
          >
        </td>

        <td>
          <input
            id="editBebidaCategoria_${bebida.codigo}"
            type="text"
            value="${bebida.categoria}"
            style="width:150px; padding:10px; border:1px solid #e5e7eb; border-radius:10px;"
          >
        </td>

        <td>
          <input
            id="editBebidaPreco_${bebida.codigo}"
            type="number"
            step="0.01"
            value="${bebida.preco}"
            style="width:110px; padding:10px; border:1px solid #e5e7eb; border-radius:10px;"
          >
        </td>

        <td>
          <button class="btn btn-green" onclick="salvarEdicaoBebida(${bebida.codigo})">
            Salvar
          </button>

          <button class="btn btn-gray" onclick="cancelarEdicaoBebida()" style="margin-top:8px;">
            Cancelar
          </button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td>${bebida.codigo}</td>
        <td><strong>${bebida.nome}</strong></td>
        <td>${bebida.categoria}</td>
        <td>${dinheiro(bebida.preco)}</td>

        <td>
          <button class="btn btn-dark" onclick="editarBebida(${bebida.codigo})">
            Editar
          </button>

          <button class="btn btn-gray" onclick="excluirBebida(${bebida.codigo})" style="margin-top:8px;">
            Excluir
          </button>
        </td>
      `;
    }

    tabela.appendChild(tr);
  });

  qtd.textContent = `${bebidas.length} bebidas`;
}

/* PEDIDOS E RELATÓRIO */

function nomeTipo(tipo) {
  if (tipo === "delivery") return "Delivery";
  if (tipo === "salao") return "Salão";
  if (tipo === "balcao") return "Balcão";
  return tipo;
}

function renderizarPedidos() {
  const tabela = document.getElementById("tabelaPedidos");
  const totalPedidosTexto = document.getElementById("totalPedidosTexto");

  if (!tabela || !totalPedidosTexto) return;

  tabela.innerHTML = "";

  pedidos.forEach(pedido => {
    const tr = document.createElement("tr");
    const nomesItens = pedido.itens.map(item => {
      return `${item.quantidade}x ${item.nome}`;
    }).join("<br>");

    tr.innerHTML = `
      <td>#${pedido.numero}</td>
      <td>${nomeTipo(pedido.tipo)}</td>
      <td>
        <strong>${pedido.cliente}</strong>
        ${pedido.telefone ? `<br><small>${pedido.telefone}</small>` : ""}
        ${pedido.endereco ? `<br><small>${pedido.endereco}</small>` : ""}
      </td>
      <td>${nomesItens}</td>
      <td>${pedido.pagamento}</td>
      <td>${dinheiro(pedido.total)}</td>
      <td><span class="badge badge-green">${pedido.status}</span></td>
    `;

    tabela.appendChild(tr);
  });

  totalPedidosTexto.textContent = `${pedidos.length} pedidos`;
}

function renderizarRelatorio() {
  const tabela = document.getElementById("tabelaRelatorio");

  if (!tabela) return;

  tabela.innerHTML = "";

  let faturamento = 0;
  let itensVendidos = 0;

  pedidos.forEach(pedido => {
    faturamento += pedido.total;

    pedido.itens.forEach(item => {
      itensVendidos += item.quantidade;
    });

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>#${pedido.numero}</td>
      <td>${nomeTipo(pedido.tipo)}</td>
      <td>${pedido.pagamento}</td>
      <td>${dinheiro(pedido.total)}</td>
      <td><span class="badge badge-green">${pedido.status}</span></td>
    `;

    tabela.appendChild(tr);
  });

  const ticketMedio = pedidos.length > 0 ? faturamento / pedidos.length : 0;

  document.getElementById("relVendas").textContent = pedidos.length;
  document.getElementById("relFaturamento").textContent = dinheiro(faturamento);
  document.getElementById("relTicket").textContent = dinheiro(ticketMedio);
  document.getElementById("relItens").textContent = itensVendidos;
}

/* CONFIGURAÇÕES */

function salvarConfig() {
  alert("Configurações salvas.");
}

function abrirCaixa() {
  document.querySelector(".status-caixa").textContent = "Caixa Aberto";
  document.querySelector(".status-caixa").style.background = "#dcfce7";
  document.querySelector(".status-caixa").style.color = "#166534";
}

function fecharCaixa() {
  document.querySelector(".status-caixa").textContent = "Caixa Fechado";
  document.querySelector(".status-caixa").style.background = "#fee2e2";
  document.querySelector(".status-caixa").style.color = "#991b1b";
}

/* ATUALIZAÇÃO GERAL */

function atualizarTelas() {
  renderizarProdutos();
  preencherSaboresMeioMeio();
  renderizarCardapio();
  renderizarBebidas();
  renderizarPedidos();
  renderizarRelatorio();
  renderizarComandas();
  atualizarAbasProduto();
}

atualizarTelas();