from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from pydantic import BaseModel
from database import get_session, verify_connection, close_driver
from auth import hash_senha, verificar_senha, criar_token, validar_token


# =============================================================================
# SCHEMAS (modelos de entrada da API)
# =============================================================================

class CadastroSchema(BaseModel):
    nome: str
    usuario: str       # login único
    senha: str
    perfil_atual: str = ""

class LoginSchema(BaseModel):
    usuario: str
    senha: str

class HabilidadeSchema(BaseModel):
    nome: str


# =============================================================================
# INICIALIZAÇÃO DO APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# =============================================================================
# DEPENDÊNCIA DE AUTENTICAÇÃO
# =============================================================================

def get_usuario_atual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependência injetada nos endpoints protegidos.
    Valida o token JWT do header Authorization: Bearer <token>
    e retorna o payload com os dados do usuário logado.
    """
    try:
        payload = validar_token(credentials.credentials)
        return payload
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/", tags=["Status"])
def root():
    return {"status": "online", "message": "CareerMatch API"}


# =============================================================================
# AUTH — Cadastro
# =============================================================================

@app.post("/cadastrar", tags=["Auth"])
def cadastrar(data: CadastroSchema):
    """
    Cria um novo usuário no Neo4j.
    - Verifica se o login já existe
    - Faz hash da senha com bcrypt antes de salvar
    - Gera um ID sequencial automático (U001, U002, ...)
    - Retorna JWT já na resposta para login automático após cadastro
    """
    with get_session() as session:

        # Verifica duplicata de login
        existente = session.run(
            "MATCH (u:Usuario {usuario: $usuario}) RETURN u",
            usuario=data.usuario
        ).single()

        if existente:
            raise HTTPException(status_code=400, detail="Usuário já cadastrado")

        # Gera ID sequencial
        total = session.run("MATCH (u:Usuario) RETURN count(u) AS total").single()["total"]
        novo_id = f"U{str(total + 1).zfill(3)}"

        # Cria o nó Usuario com senha hasheada
        session.run(
            """
            CREATE (u:Usuario {
                id:           $id,
                nome:         $nome,
                usuario:      $usuario,
                senha_hash:   $senha_hash,
                perfil_atual: $perfil_atual
            })
            """,
            id=novo_id,
            nome=data.nome,
            usuario=data.usuario,
            senha_hash=hash_senha(data.senha),
            perfil_atual=data.perfil_atual,
        )

    token = criar_token({"sub": novo_id, "usuario": data.usuario, "nome": data.nome})
    return {"token": token, "usuario_id": novo_id, "nome": data.nome}


# =============================================================================
# AUTH — Login
# =============================================================================

@app.post("/login", tags=["Auth"])
def login(data: LoginSchema):
    """
    Valida credenciais e retorna JWT.
    - Busca o usuário pelo login
    - Compara senha com hash bcrypt
    - Retorna token JWT com payload: sub (id), usuario, nome
    """
    with get_session() as session:
        result = session.run(
            """
            MATCH (u:Usuario {usuario: $usuario})
            RETURN u.id AS id, u.nome AS nome,
                   u.usuario AS usuario, u.senha_hash AS senha_hash
            """,
            usuario=data.usuario
        ).single()

    if not result:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    if not verificar_senha(data.senha, result["senha_hash"]):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    token = criar_token({
        "sub":     result["id"],
        "usuario": result["usuario"],
        "nome":    result["nome"],
    })

    return {
        "token":      token,
        "usuario_id": result["id"],
        "nome":       result["nome"],
    }


# =============================================================================
# PERFIL
# =============================================================================

@app.get("/perfil/{usuario_id}", tags=["Perfil"])
def get_perfil(usuario_id: str, atual=Depends(get_usuario_atual)):
    """
    Retorna dados do usuário + habilidades que ele possui.
    Endpoint protegido por JWT.
    """
    with get_session() as session:
        usuario = session.run(
            """
            MATCH (u:Usuario {id: $id})
            RETURN u.id AS id, u.nome AS nome,
                   u.usuario AS usuario, u.perfil_atual AS perfil_atual
            """,
            id=usuario_id
        ).single()

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        habilidades = session.run(
            """
            MATCH (u:Usuario {id: $id})-[:POSSUI]->(h:Habilidade)
            RETURN h.nome AS nome, h.tipo AS tipo
            ORDER BY h.nome
            """,
            id=usuario_id
        )
        habilidades = [dict(r) for r in habilidades]

    return {**dict(usuario), "habilidades": habilidades}


@app.get("/habilidades", tags=["Perfil"])
def listar_habilidades(atual=Depends(get_usuario_atual)):
    """
    Lista todas as habilidades cadastradas no banco.
    Usado para popular o seletor na página de perfil.
    """
    with get_session() as session:
        result = session.run(
            """
            MATCH (h:Habilidade)
            RETURN h.nome AS nome, h.tipo AS tipo
            ORDER BY h.tipo, h.nome
            """
        )
        return {"habilidades": [dict(r) for r in result]}


@app.post("/perfil/{usuario_id}/habilidades", tags=["Perfil"])
def adicionar_habilidade(usuario_id: str, data: HabilidadeSchema, atual=Depends(get_usuario_atual)):
    """
    Cria o relacionamento (Usuario)-[:POSSUI]->(Habilidade).
    Usa MERGE para evitar duplicatas.
    """
    with get_session() as session:
        session.run(
            """
            MATCH (u:Usuario {id: $id})
            MATCH (h:Habilidade {nome: $nome})
            MERGE (u)-[:POSSUI]->(h)
            """,
            id=usuario_id,
            nome=data.nome
        )
    return {"mensagem": f"Habilidade '{data.nome}' adicionada com sucesso"}


@app.delete("/perfil/{usuario_id}/habilidades/{nome}", tags=["Perfil"])
def remover_habilidade(usuario_id: str, nome: str, atual=Depends(get_usuario_atual)):
    """
    Remove o relacionamento (Usuario)-[:POSSUI]->(Habilidade).
    Não apaga o nó Habilidade, apenas a aresta.
    """
    with get_session() as session:
        session.run(
            """
            MATCH (u:Usuario {id: $id})-[r:POSSUI]->(h:Habilidade {nome: $nome})
            DELETE r
            """,
            id=usuario_id,
            nome=nome
        )
    return {"mensagem": f"Habilidade '{nome}' removida com sucesso"}


# =============================================================================
# USUÁRIOS
# =============================================================================

@app.get("/usuarios", tags=["Usuários"])
def listar_usuarios():
    with get_session() as session:
        result = session.run(
            """
            MATCH (u:Usuario)
            RETURN u.id AS id, u.nome AS nome, u.perfil_atual AS perfil_atual
            ORDER BY u.nome
            """
        )
        usuarios = [dict(r) for r in result]
    if not usuarios:
        raise HTTPException(status_code=404, detail="Nenhum usuário encontrado")
    return {"usuarios": usuarios}


# =============================================================================
# RECOMENDAÇÃO
# =============================================================================

@app.get("/recomendar/{usuario_id}", tags=["Recomendação"])
def recomendar_cargos(usuario_id: str, atual=Depends(get_usuario_atual)):
    """
    Ranking de Cargos com Match Score baseado nas habilidades do usuário.

    Lógica Cypher:
        1. Coleta habilidades que o usuário POSSUI
        2. Para cada Cargo, coleta habilidades que ele EXIGE
        3. Calcula interseção (possuídas) e diferença (gaps)
        4. Match Score = possuídas / exigidas * 100
        5. Ordena por score DESC
    """
    with get_session() as session:
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.nome AS nome, u.perfil_atual AS perfil_atual",
            id=usuario_id
        ).single()

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        result = session.run(
            """
            MATCH (u:Usuario {id: $usuario_id})-[:POSSUI]->(h_user:Habilidade)
            WITH u, collect(h_user) AS habilidades_usuario

            MATCH (c:Cargo)-[:EXIGE]->(h_cargo:Habilidade)
            WITH c, habilidades_usuario, collect(DISTINCT h_cargo) AS habilidades_exigidas

            WITH c,
                 [h IN habilidades_exigidas | h.nome] AS exigidas,
                 [h IN habilidades_exigidas WHERE h IN habilidades_usuario | h.nome] AS possuidas

            WITH c, exigidas, possuidas,
                 [h IN exigidas WHERE NOT h IN possuidas] AS gaps,
                 CASE size(exigidas)
                     WHEN 0 THEN 0
                     ELSE round(toFloat(size(possuidas)) / size(exigidas) * 100)
                 END AS match_score

            RETURN
                c.id            AS id,
                c.titulo        AS titulo,
                c.nivel         AS nivel,
                c.salario_medio AS salario_medio,
                exigidas,
                possuidas,
                gaps,
                match_score
            ORDER BY match_score DESC
            """,
            usuario_id=usuario_id
        )
        cargos = [dict(r) for r in result]

    return {"usuario": dict(usuario), "total_cargos": len(cargos), "ranking": cargos}


@app.get("/cursos/{usuario_id}", tags=["Recomendação"])
def recomendar_cursos(usuario_id: str, atual=Depends(get_usuario_atual)):
    """
    Cursos que cobrem os gaps do usuário, ordenados por quantos gaps cobrem.
    """
    with get_session() as session:
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.nome AS nome",
            id=usuario_id
        ).single()

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        result = session.run(
            """
            MATCH (u:Usuario {id: $usuario_id})-[:POSSUI]->(h_possui:Habilidade)
            WITH u, collect(h_possui) AS tem

            MATCH (c:Cargo)-[:EXIGE]->(h_gap:Habilidade)
            WHERE NOT h_gap IN tem

            MATCH (curso:Curso)-[:ENSINA]->(h_gap)

            WITH curso,
                 collect(DISTINCT h_gap.nome) AS habilidades_ensinadas,
                 count(DISTINCT h_gap)        AS gaps_cobertos

            RETURN
                curso.id         AS id,
                curso.nome       AS nome,
                curso.plataforma AS plataforma,
                habilidades_ensinadas,
                gaps_cobertos
            ORDER BY gaps_cobertos DESC
            """,
            usuario_id=usuario_id
        )
        cursos = [dict(r) for r in result]

    return {"usuario": usuario["nome"], "total_cursos": len(cursos), "cursos": cursos}


# =============================================================================
# GRAFO
# =============================================================================

@app.get("/grafo/{usuario_id}", tags=["Visualização"])
def dados_grafo(usuario_id: str, atual=Depends(get_usuario_atual)):
    """
    Retorna nós e arestas formatados para o react-force-graph-2d.
    """
    with get_session() as session:
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.id AS id, u.nome AS nome",
            id=usuario_id
        ).single()

        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        result = session.run(
            """
            MATCH (u:Usuario {id: $usuario_id})
            OPTIONAL MATCH (u)-[:POSSUI]->(h:Habilidade)
            OPTIONAL MATCH (u)-[:ALMEJA]->(ca:Cargo)
            OPTIONAL MATCH (u)-[:POSSUI]->(h2:Habilidade)<-[:EXIGE]-(cr:Cargo)
            WITH u,
                 collect(DISTINCT h)  AS habilidades,
                 collect(DISTINCT ca) AS almejados,
                 collect(DISTINCT cr) AS recomendados
            RETURN u, habilidades, almejados, recomendados
            """,
            usuario_id=usuario_id
        ).single()

        nodes, links = [], []
        ids_adicionados = set()

        def add_node(node_id, label, node_type, extra=None):
            if node_id not in ids_adicionados:
                entry = {"id": node_id, "label": label, "type": node_type}
                if extra:
                    entry.update(extra)
                nodes.append(entry)
                ids_adicionados.add(node_id)

        u = result["u"]
        add_node(u["id"], u["nome"], "usuario")

        for h in result["habilidades"]:
            if h:
                add_node(h["id"], h["nome"], "habilidade", {"tipo": h.get("tipo")})
                links.append({"source": u["id"], "target": h["id"], "label": "POSSUI"})

        for ca in result["almejados"]:
            if ca:
                add_node(ca["id"], ca["titulo"], "cargo_almejado",
                         {"nivel": ca.get("nivel"), "salario_medio": ca.get("salario_medio")})
                links.append({"source": u["id"], "target": ca["id"], "label": "ALMEJA"})

        for cr in result["recomendados"]:
            if cr:
                add_node(cr["id"], cr["titulo"], "cargo_recomendado",
                         {"nivel": cr.get("nivel"), "salario_medio": cr.get("salario_medio")})
                for h in result["habilidades"]:
                    if h:
                        links.append({"source": h["id"], "target": cr["id"], "label": "EXIGE"})

    return {"nodes": nodes, "links": links}