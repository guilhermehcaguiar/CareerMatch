from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import get_session, verify_connection, close_driver

# =============================================================================
# INICIALIZAÇÃO DO APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida do app:
      - startup:  testa a conexão com o Neo4j
      - shutdown: fecha o driver corretamente
    """
    verify_connection()
    print("✅ Conectado ao Neo4j AuraDB")
    yield
    close_driver()
    print("🔌 Conexão com Neo4j encerrada")


app = FastAPI(
    title="CareerMatch",
    description="Sistema que usa banco de dados de grafos para recomendar cargos com base nas habilidades do usuário",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — permite que o frontend React (localhost:5173) acesse a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/", tags=["Status"])
def root():
    return {"status": "online", "message": "CareerMatch está rodando!"}


# =============================================================================
# ENDPOINT 1 — Listar Usuários
# =============================================================================

@app.get("/usuarios", tags=["Usuários"])
def listar_usuarios():
    """
    Retorna todos os usuários cadastrados no banco.
    Usado pelo frontend para popular o dropdown de seleção.

    Query Cypher:
        MATCH (u:Usuario)
        → Busca todos os nós do tipo Usuario
        RETURN u.id, u.nome, u.perfil_atual
        → Retorna apenas as propriedades necessárias (evita expor o id interno do Neo4j)
    """
    with get_session() as session:
        result = session.run(
            """
            MATCH (u:Usuario)
            RETURN u.id AS id, u.nome AS nome, u.perfil_atual AS perfil_atual
            ORDER BY u.nome
            """
        )
        usuarios = [dict(record) for record in result]

    if not usuarios:
        raise HTTPException(status_code=404, detail="Nenhum usuário encontrado")

    return {"usuarios": usuarios}


# =============================================================================
# ENDPOINT 2 — Ranking de Cargos (endpoint principal)
# =============================================================================

@app.get("/recomendar/{usuario_id}", tags=["Recomendação"])
def recomendar_cargos(usuario_id: str):
    """
    Retorna um ranking de Cargos recomendados para o usuário,
    calculando um Match Score baseado nas habilidades.

    ─── LÓGICA DA QUERY CYPHER (passo a passo) ───────────────────────────────

    PASSO 1 — Encontra o usuário pelo id:
        MATCH (u:Usuario {id: $usuario_id})

    PASSO 2 — Coleta TODAS as habilidades que o usuário possui:
        MATCH (u)-[:POSSUI]->(h_user:Habilidade)

    PASSO 3 — Para cada Cargo existente, coleta as habilidades que ele exige:
        MATCH (c:Cargo)-[:EXIGE]->(h_cargo:Habilidade)

    PASSO 4 — Agrega por Cargo e calcula o score:
        WITH c,
             collect(DISTINCT h_cargo.nome) AS exigidas,
             collect(DISTINCT CASE
                 WHEN h_cargo IN habilidades_usuario THEN h_cargo.nome
             END) AS possuidas
        → possuidas = interseção entre o que o usuário tem e o que o cargo exige

    PASSO 5 — Calcula o Match Score como porcentagem:
        toFloat(size(possuidas)) / size(exigidas) * 100

    PASSO 6 — Calcula os gaps (habilidades que faltam):
        [h IN exigidas WHERE NOT h IN possuidas]

    PASSO 7 — Ordena do maior para o menor match:
        ORDER BY match_score DESC
    ──────────────────────────────────────────────────────────────────────────
    """
    with get_session() as session:

        # Valida se o usuário existe
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.nome AS nome, u.perfil_atual AS perfil_atual",
            id=usuario_id
        ).single()

        if not usuario:
            raise HTTPException(status_code=404, detail=f"Usuário '{usuario_id}' não encontrado")

        # Query principal de recomendação
        result = session.run(
            """
            // PASSO 1 + 2: usuário e suas habilidades
            MATCH (u:Usuario {id: $usuario_id})-[:POSSUI]->(h_user:Habilidade)
            WITH u, collect(h_user) AS habilidades_usuario

            // PASSO 3: todos os cargos e suas habilidades exigidas
            MATCH (c:Cargo)-[:EXIGE]->(h_cargo:Habilidade)

            // PASSO 4: agrupa por cargo
            WITH c, habilidades_usuario,
                 collect(DISTINCT h_cargo) AS habilidades_exigidas

            // PASSO 5 + 6: calcula possuídas, gaps e score
            WITH c,
                 [h IN habilidades_exigidas | h.nome] AS exigidas,
                 [h IN habilidades_exigidas WHERE h IN habilidades_usuario | h.nome] AS possuidas

            WITH c, exigidas, possuidas,
                 [h IN exigidas WHERE NOT h IN possuidas] AS gaps,
                 CASE size(exigidas)
                     WHEN 0 THEN 0
                     ELSE round(toFloat(size(possuidas)) / size(exigidas) * 100)
                 END AS match_score

            // PASSO 7: ordena
            RETURN
                c.id          AS id,
                c.titulo      AS titulo,
                c.nivel       AS nivel,
                c.salario_medio AS salario_medio,
                exigidas,
                possuidas,
                gaps,
                match_score
            ORDER BY match_score DESC
            """,
            usuario_id=usuario_id
        )

        cargos = [dict(record) for record in result]

    return {
        "usuario": dict(usuario),
        "total_cargos": len(cargos),
        "ranking": cargos,
    }


# =============================================================================
# ENDPOINT 3 — Cursos Recomendados para Fechar Gaps
# =============================================================================

@app.get("/cursos/{usuario_id}", tags=["Recomendação"])
def recomendar_cursos(usuario_id: str):
    """
    Retorna cursos que ensinam habilidades que o usuário ainda não possui,
    priorizando os cursos que cobrem mais gaps de uma vez.

    Lógica:
        1. Encontra todas as habilidades que o usuário NÃO possui
           mas que algum Cargo exige (= gaps reais)
        2. Encontra Cursos que ENSINAM essas habilidades em falta
        3. Ordena pelos cursos que cobrem mais gaps
    """
    with get_session() as session:

        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.nome AS nome",
            id=usuario_id
        ).single()

        if not usuario:
            raise HTTPException(status_code=404, detail=f"Usuário '{usuario_id}' não encontrado")

        result = session.run(
            """
            // Habilidades que o usuário possui
            MATCH (u:Usuario {id: $usuario_id})-[:POSSUI]->(h_possui:Habilidade)
            WITH u, collect(h_possui) AS tem

            // Habilidades exigidas por algum cargo que o usuário NÃO tem (gaps)
            MATCH (c:Cargo)-[:EXIGE]->(h_gap:Habilidade)
            WHERE NOT h_gap IN tem

            // Cursos que ensinam esses gaps
            MATCH (curso:Curso)-[:ENSINA]->(h_gap)

            // Agrupa por curso e conta quantos gaps ele cobre
            WITH curso,
                 collect(DISTINCT h_gap.nome) AS habilidades_ensinadas,
                 count(DISTINCT h_gap) AS gaps_cobertos

            RETURN
                curso.id          AS id,
                curso.nome        AS nome,
                curso.plataforma  AS plataforma,
                habilidades_ensinadas,
                gaps_cobertos
            ORDER BY gaps_cobertos DESC
            """,
            usuario_id=usuario_id
        )

        cursos = [dict(record) for record in result]

    return {
        "usuario": usuario["nome"],
        "total_cursos": len(cursos),
        "cursos": cursos,
    }


# =============================================================================
# ENDPOINT 4 — Dados do Grafo para Visualização
# =============================================================================

@app.get("/grafo/{usuario_id}", tags=["Visualização"])
def dados_grafo(usuario_id: str):
    """
    Retorna nós e arestas formatados para o react-force-graph-2d.

    Formato esperado pelo frontend:
        {
            "nodes": [{ "id": "...", "label": "...", "type": "..." }],
            "links": [{ "source": "...", "target": "...", "label": "..." }]
        }

    Inclui: o usuário, suas habilidades, os cargos que ele almeja
    e os cargos recomendados com as habilidades relacionadas.
    """
    with get_session() as session:

        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.id AS id, u.nome AS nome",
            id=usuario_id
        ).single()

        if not usuario:
            raise HTTPException(status_code=404, detail=f"Usuário '{usuario_id}' não encontrado")

        result = session.run(
            """
            MATCH (u:Usuario {id: $usuario_id})

            // Habilidades do usuário
            OPTIONAL MATCH (u)-[:POSSUI]->(h:Habilidade)

            // Cargos almejados
            OPTIONAL MATCH (u)-[:ALMEJA]->(ca:Cargo)

            // Cargos recomendados (que têm ao menos 1 habilidade em comum)
            OPTIONAL MATCH (u)-[:POSSUI]->(h2:Habilidade)<-[:EXIGE]-(cr:Cargo)

            WITH u,
                 collect(DISTINCT h)  AS habilidades,
                 collect(DISTINCT ca) AS almejados,
                 collect(DISTINCT cr) AS recomendados

            RETURN u, habilidades, almejados, recomendados
            """,
            usuario_id=usuario_id
        )

        row = result.single()

        nodes = []
        links = []
        ids_adicionados = set()

        def add_node(node_id, label, node_type, extra=None):
            if node_id not in ids_adicionados:
                entry = {"id": node_id, "label": label, "type": node_type}
                if extra:
                    entry.update(extra)
                nodes.append(entry)
                ids_adicionados.add(node_id)

        u = row["u"]
        add_node(u["id"], u["nome"], "usuario")

        # Habilidades do usuário
        for h in row["habilidades"]:
            if h:
                add_node(h["id"], h["nome"], "habilidade", {"tipo": h.get("tipo")})
                links.append({"source": u["id"], "target": h["id"], "label": "POSSUI"})

        # Cargos almejados
        for ca in row["almejados"]:
            if ca:
                add_node(ca["id"], ca["titulo"], "cargo_almejado",
                         {"nivel": ca.get("nivel"), "salario_medio": ca.get("salario_medio")})
                links.append({"source": u["id"], "target": ca["id"], "label": "ALMEJA"})

        # Cargos recomendados (com habilidades em comum)
        for cr in row["recomendados"]:
            if cr:
                add_node(cr["id"], cr["titulo"], "cargo_recomendado",
                         {"nivel": cr.get("nivel"), "salario_medio": cr.get("salario_medio")})
                # Liga habilidades já adicionadas ao cargo recomendado
                for h in row["habilidades"]:
                    if h:
                        links.append({"source": h["id"], "target": cr["id"], "label": "EXIGE"})

    return {"nodes": nodes, "links": links}