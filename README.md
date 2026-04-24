# PDV Pizzaria (HTML/CSS/JavaScript)

Sistema de PDV simples para rodar localmente no navegador, sem dependências externas.

## Como executar localmente

1. Baixe/clone este repositório.
2. Abra o arquivo `index.html` no navegador **ou** rode um servidor local:

```bash
python3 -m http.server 8080
```

Depois acesse: `http://localhost:8080`

## Rodando o projeto (passo a passo)

### Opção 1 — Abrir direto no navegador

1. Entre na pasta do projeto.
2. Dê duplo clique no arquivo `index.html`.
3. Faça login com:
   - Usuário: `admin`
   - Senha: `1234`

### Opção 2 — Servidor local (recomendado)

No terminal, dentro da pasta do projeto:

```bash
python3 -m http.server 8080
```

Depois abra no navegador:

`http://localhost:8080`

### Como parar o servidor

No terminal em que o servidor estiver rodando, pressione:

`Ctrl + C`

## Login padrão

- Usuário: `admin`
- Senha: `1234`

## Funcionalidades implementadas

- Login com validação de usuário cadastrado
- Menu por abas:
  - Abertura de Caixa
  - Cadastro
  - PDV (Vendas)
  - Histórico de Caixa
- Abertura/fechamento de caixa com bloqueio de vendas quando fechado
- Cadastro de:
  - Pizzas (Broto/Grande)
  - Adicionais
  - Bordas
  - Bebidas (refrigerante, vinho, cerveja)
- PDV com tipos de venda:
  - Delivery
  - Balcão
  - Mesa
- Montagem de pedido com cálculo automático
- Pagamento por Dinheiro, Cartão ou Pix
- Histórico com resumo financeiro do caixa
- Persistência local via `localStorage`

## Observações

- Projeto pensado para evolução futura (níveis de usuário, meio a meio, relatórios, estoque, WhatsApp, etc.).
