# CareerMatch 🤖

**Match de Carreira Inteligente** — Um sistema web que analisa habilidades profissionais, calcula compatibilidade com cargos e recomenda cursos para preencher lacunas de conhecimento, utilizando banco de dados em grafo.

> Projeto acadêmico com fins educativos e avaliativos.

---

## 📋 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Pré-requisitos](#-pré-requisitos)
- [Como Executar](#-como-executar)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API Endpoints](#-api-endpoints)
- [Modelagem do Grafo](#-modelagem-do-grafo)
- [Autores](#-autores)

---

## 💡 Sobre o Projeto

O CareerMatch resolve o problema de **orientação profissional** através de um grafo de conhecimento. O usuário cadastra suas habilidades (hard/soft skills) e o sistema:

1. **Calcula match scores** com centenas de cargos
2. **Identifica gaps** — habilidades que faltam para cada vaga
3. **Recomenda cursos** que ensinam exatamente o que está faltando
4. **Exibe um roadmap visual** com a progressão recomendada

Diferente de soluções tradicionais (tabelas relacionais), o uso do **Neo4j (grafo)** permite navegar naturalmente pelas relações entre Usuários, Habilidades, Cargos e Cursos.

---

## ⚙️ Tecnologias

### Frontend
| Tecnologia | Versão | Função |
|---|---|---|
| React | 19.x | Interface de usuário (SPA) |
| Vite | 8.x | Bundler e dev server |
| React Router | 7.x | Roteamento SPA |
| Tailwind CSS | 4.x | Estilização utilitária |
| Axios | 1.x | HTTP client |
| react-force-graph-2d | 1.x | Visualização do grafo |

### Backend
| Tecnologia | Versão | Função |
|---|---|---|
| Python | 3.12+ | Runtime |
| FastAPI | 0.x | Framework REST |
| Neo4j Driver | 5.x | Conexão com banco grafo |
| PyJWT | 2.x | Autenticação JWT |
| bcrypt | 4.x | Hash de senhas |
| Uvicorn | — | Servidor ASGI |

### Banco de Dados
| Tecnologia | Função |
|---|---|
| Neo4j AuraDB | Banco de grafo cloud-native |

---

## 🏗️ Arquitetura

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Frontend   │ ────→ │   Backend    │ ────→ │   Neo4j     │
│  React SPA  │       │  FastAPI     │       │  AuraDB     │
│  :5173      │       │  :8000       │       │  (cloud)    │
└─────────────┘       └──────────────┘       └─────────────┘
       │                      │
   localStorage           JWT Token
   (auth + theme)      (Bearer Auth)
```

- Frontend e backend comunicam-se via REST (JSON)
- Autenticação stateless via JWT (8h de validade)
- Tema light/dark/sistema persistido no `localStorage`
- Seed do banco feito diretamente no Neo4j (console AuraDB ou Cypher Shell)

---

## ✨ Funcionalidades

- **Cadastro e Login** com hash de senha (bcrypt) + JWT
- **Gerenciamento de Perfil** — edição inline de nome, nome de usuário (com verificação de duplicidade) e cargo atual, protegida por senha; feedback visual com mensagens de sucesso/erro vindas diretamente da API
- **Dashboard** com cards de resumo, roadmap de carreira e cursos recomendados
- **Match Score** percentual por cargo (baseado em habilidades possuídas vs. exigidas)
- **Recomendações Detalhadas** — cargos com expansão de gaps, busca por nome, botão "Ver Roadmap" que salva a carreira escolhida no banco, cursos organizados por plataforma
- **Roadmap Interativo** — selecione uma carreira na página de recomendações ou no próprio roadmap; visualize um roadmap visual com setas (`POSSUI → FALTA → OBJETIVO`) conectando posição atual → habilidades → gaps → cargo almejado, com estatísticas, barra de distribuição e modal de cursos ao clicar em cada habilidade; escolha persiste no banco via relação `ALMEJA`
- **Sidebar Retrátil** — menu lateral ocultável com barra superior integrada exibindo o nome da página; conteúdo se ajusta automaticamente ao espaço disponível
- **Visualização em Grafo** — mapa interativo das conexões do usuário (habilidades, cargos almejados, recomendações)
- **Tema Claro/Escuro/Sistema** com transição suave e preferência persistida
- **Design Responsivo** — sidebar adaptável, grid fluido, suporte mobile

---

## 📦 Pré-requisitos

- **Node.js** 18+ e **npm**
- **Python** 3.12+
- Uma instância do **Neo4j AuraDB** (ou local) com os dados seeded

---

## 🚀 Como Executar

### 1. Clone e acesse o repositório

```bash
git clone https://github.com/seu-usuario/careermatch.git
cd careermatch
```

### 2. Configure o banco de dados

Crie o arquivo `backend/.env` baseado em `backend/.env.example`:

```env
NEO4J_URI=neo4j+ssc://seu-id.databases.neo4j.io
NEO4J_USERNAME=seu-usuario
NEO4J_PASSWORD=sua-senha
NEO4J_DATABASE=nome-do-banco
SECRET_KEY=uma-chave-secreta-forte
```

### 3. Popule o banco (Neo4j)

Execute os comandos presentes no arquivo abaixo no query do neo4j (Mesmos comando utilizados para popular nosso banco, gerados pelo Gemini)

```
popular_banco.txt
```

### 4. Execute o inicializador

```bash
inicializar.bat
```

Este script:
- Cria/ativa o venv do Python
- Instala as dependências do backend (`pip install`)
- Instala as dependências do frontend (`npm install`)
- Sobe o backend em `http://localhost:8000`
- Sobe o frontend em `http://localhost:5173`
- Abre o navegador automaticamente

### Ou manualmente

```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn pydantic neo4j bcrypt pyjwt python-dotenv
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

---

## 📁 Estrutura do Projeto

```
careermatch/
├── readme.MD
├── inicializar.bat
├── backend/
│   ├── .env                # Credenciais 
│   ├── .env.example        # Template de variáveis
│   ├── main.py             # API REST (FastAPI)
│   ├── database.py         # Conexão Neo4j
│   ├── auth.py             # JWT + bcrypt
│   └── requirements.txt    # Dependências Python
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.cjs
    ├── index.html
    └── src/
        ├── main.jsx            # Entry point React
        ├── App.jsx             # Rotas da aplicação
        ├── index.css           # Tailwind + variáveis tema
        ├── components/
        │   ├── AppLayout.jsx   # Layout principal (sidebar/navbar)
        │   ├── Navbar.jsx      # Navbar superior
        │   ├── Sidebar.jsx     # Sidebar responsiva
        │   ├── ThemeToggle.jsx # Seletor de tema (Light/Dark/Sistema)
        │   └── ProtectedRoute.jsx  # Rota autenticada
        ├── contexts/
        │   ├── AuthContext.jsx  # Contexto de autenticação
        │   └── ThemeContext.jsx # Contexto de tema
        ├── pages/
        │   ├── Landing.jsx     # Página inicial
        │   ├── Login.jsx       # Login
        │   ├── Cadastro.jsx    # Cadastro
        │   ├── Perfil.jsx      # Gerenciamento de habilidades + edição de perfil
        │   ├── Dashboard.jsx   # Visão geral + roadmap
        │   ├── Recomendacoes.jsx  # Cargos e cursos detalhados
        │   └── Roadmap.jsx     # Roadmap visual interativo com setas
        └── services/
            └── api.js          # Axios instance + interceptors
```

---

## 🌐 API Endpoints

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| `GET` | `/` | Status da API | ❌ |
| `POST` | `/cadastrar` | Cadastro de usuário | ❌ |
| `POST` | `/login` | Login | ❌ |
| `GET` | `/perfil/{id}` | Dados do perfil | ✅ |
| `GET` | `/habilidades` | Lista todas habilidades | ✅ |
| `PUT` | `/perfil/{id}` | Atualiza nome, usuário e/ou cargo (requer senha) | ✅ |
| `POST` | `/perfil/{id}/habilidades` | Adiciona habilidade ao perfil | ✅ |
| `DELETE` | `/perfil/{id}/habilidades/{nome}` | Remove habilidade do perfil | ✅ |
| `POST` | `/habilidades` | Cria nova habilidade no banco | ✅ |
| `GET` | `/habilidades` | Lista todas habilidades | ✅ |
| `GET` | `/almejado/{id}` | Retorna a carreira que o usuário definiu como objetivo | ✅ |
| `POST` | `/almejar/{id}/{cargo_id}` | Define/salva uma carreira como objetivo do usuário | ✅ |
| `GET` | `/cursos-por-habilidade/{nome}` | Cursos que ensinam uma habilidade específica | ✅ |
| `GET` | `/usuarios` | Lista todos usuários | ❌ |
| `GET` | `/recomendar/{id}` | Recomendação de cargos (match) | ✅ |
| `GET` | `/cursos/{id}` | Recomendação de cursos (gaps) | ✅ |
| `GET` | `/grafo/{id}` | Dados para visualização em grafo | ✅ |

---

## 🧠 Modelagem do Grafo

```
(Usuario)-[:POSSUI]->(Habilidade)
(Cargo)-[:EXIGE]->(Habilidade)
(Curso)-[:ENSINA]->(Habilidade)
(Usuario)-[:ALMEJA]->(Cargo)
```

### Nós

| Label | Propriedades |
|---|---|
| `Usuario` | `id`, `nome`, `usuario`, `senha_hash`, `perfil_atual` |
| `Habilidade` | `id`, `nome`, `tipo` (hard/soft) |
| `Cargo` | `id`, `titulo`, `nivel`, `salario_medio` |
| `Curso` | `id`, `nome`, `plataforma` |

### Lógica do Match Score

```
match_score = (habilidades_possuidas_para_o_cargo / total_exigidas_pelo_cargo) × 100
```

Cargos com score ≥ 70% são verdes, entre 40-69% são amarelos, abaixo são vermelhos. Cursos são recomendados filtrando aqueles que ensinam habilidades ainda não possuídas pelo usuário.

---

## 👥 Autores

Projeto desenvolvido como trabalho acadêmico para a disciplina de **Database Application** do curso **Ciências da Computação** na **Uninassau** .

- **Arthur Augusto**
- **Arthur Martins**
- **Carlos Matheus**
- **Gabriel Fernando**
- **Guilherme Aguiar**
- **Guilherme Juarez**