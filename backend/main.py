import os
import uuid
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from pydantic import BaseModel

# 🔥 Importações sincronizadas estritamente com o seu database.py e auth.py
from database import get_session, verify_connection, close_driver
from auth import hash_senha, verificar_senha, criar_token, validar_token


# =============================================================================
# SCHEMAS
# =============================================================================
class CadastroSchema(BaseModel):
    nome: str
    usuario: str
    senha: str
    perfil_atual: str = ""

class LoginSchema(BaseModel):
    usuario: str
    senha: str

class HabilidadeSchema(BaseModel):
    nome: str

class PerfilUpdateSchema(BaseModel):
    nome: str | None = None
    usuario: str | None = None
    perfil_atual: str | None = None
    senha: str


# =============================================================================
# APP
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_connection()
    print("✅ Conectado ao Neo4j AuraDB")
    yield
    close_driver()

app = FastAPI(title="CareerMatch API", version="1.0.0", lifespan=lifespan)

# CORS configurado para aceitar tráfego amplo local do Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# =============================================================================
# DEPENDÊNCIA JWT
# =============================================================================
def get_usuario_atual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return validar_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


# =============================================================================
# STATUS
# =============================================================================
@app.get("/", tags=["Status"])
def root():
    return {"status": "online"}


# =============================================================================
# CADASTRO (CORRIGIDO: EXTRAÇÃO SEGURA DO CONTADOR DO NEO4J)
# =============================================================================
@app.post("/cadastrar", tags=["Auth"])
def cadastrar(data: CadastroSchema):
    user_clean = data.usuario.strip().lower()
    
    with get_session() as session:
        existente = session.run(
            "MATCH (u:Usuario {usuario: $usuario}) RETURN u",
            usuario=user_clean
        ).single()
        if existente:
            raise HTTPException(status_code=400, detail="Usuário já cadastrado")

        # 🔥 Correção aqui: extração segura usando .value() para evitar travamentos de tipo
        result_total = session.run("MATCH (u:Usuario) RETURN count(u) AS total").single()
        total = result_total.value("total") if result_total else 0
        novo_id = f"U{str(int(total) + 1).zfill(3)}"

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
            nome=data.nome.strip(),
            usuario=user_clean,
            senha_hash=hash_senha(data.senha),
            perfil_atual=data.perfil_atual,
        )

    token = criar_token({"sub": novo_id, "usuario": user_clean, "nome": data.nome})
    return {"token": token, "usuario_id": novo_id, "nome": data.nome, "status": "sucesso"}


# =============================================================================
# LOGIN
# =============================================================================
@app.post("/login", tags=["Auth"])
def login(data: LoginSchema):
    user_clean = data.usuario.strip().lower()
    
    with get_session() as session:
        result = session.run(
            """
            MATCH (u:Usuario {usuario: $usuario})
            RETURN u.id AS id, u.nome AS nome,
                   u.usuario AS usuario, u.senha_hash AS senha_hash, u.perfil_atual AS perfil
            """,
            usuario=user_clean
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
        "token": token, 
        "usuario_id": result["id"], 
        "nome": result["nome"],
        "perfil_atual": result["perfil"] if "perfil" in result.keys() and result["perfil"] else "Dev Junior",
        "status": "sucesso"
    }


# =============================================================================
# PERFIL
# =============================================================================
@app.get("/perfil/{usuario_id}", tags=["Perfil"])
def get_perfil(usuario_id: str, atual=Depends(get_usuario_atual)):
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

    return {
        "id": usuario["id"],
        "nome": usuario["nome"],
        "usuario": usuario["usuario"],
        "perfil_atual": usuario["perfil_atual"] or "Dev Junior",
        "habilidades": habilidades
    }


@app.post("/habilidades", tags=["Perfil"])
def criar_habilidade(data: HabilidadeSchema, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        existente = session.run(
            "MATCH (h:Habilidade {nome: $nome}) RETURN h",
            nome=data.nome
        ).single()
        if existente:
            raise HTTPException(status_code=409, detail=f"Habilidade '{data.nome}' já existe")

        result_count = session.run("MATCH (h:Habilidade) RETURN count(h) AS total").single()
        total = result_count.value("total") if result_count else 0
        novo_id = f"H{str(int(total) + 1).zfill(3)}"

        session.run(
            "CREATE (h:Habilidade {id: $id, nome: $nome, tipo: 'hard'})",
            id=novo_id, nome=data.nome
        )
    return {"id": novo_id, "nome": data.nome, "mensagem": "Habilidade criada com sucesso"}


@app.get("/habilidades", tags=["Perfil"])
def listar_habilidades(atual=Depends(get_usuario_atual)):
    with get_session() as session:
        result = session.run(
            """
            MATCH (h:Habilidade)
            RETURN h.nome AS nome, h.tipo AS tipo
            ORDER BY h.tipo, h.nome
            """
        )
        return {"habilidades": [dict(r) for r in result]}


@app.put("/perfil/{usuario_id}", tags=["Perfil"])
def atualizar_perfil(usuario_id: str, data: PerfilUpdateSchema, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.senha_hash AS senha_hash",
            id=usuario_id
        ).single()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        if not verificar_senha(data.senha, usuario["senha_hash"]):
            raise HTTPException(status_code=401, detail="Senha incorreta")

        sets = []
        params = {"id": usuario_id}

        if data.usuario is not None:
            user_clean = data.usuario.strip().lower()
            existente = session.run(
                "MATCH (u:Usuario {usuario: $usuario}) WHERE u.id <> $id RETURN u",
                usuario=user_clean, id=usuario_id
            ).single()
            if existente:
                raise HTTPException(status_code=409, detail="Nome de usuário já está em uso")
            sets.append("u.usuario = $usuario")
            params["usuario"] = user_clean

        if data.nome is not None:
            sets.append("u.nome = $nome")
            params["nome"] = data.nome

        if data.perfil_atual is not None:
            sets.append("u.perfil_atual = $perfil_atual")
            params["perfil_atual"] = data.perfil_atual

        if not sets:
            raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

        session.run(
            f"MATCH (u:Usuario {{id: $id}}) SET {', '.join(sets)}",
            **params
        )

    return {"mensagem": "Perfil atualizado com sucesso"}


@app.get("/cursos-por-habilidade/{nome}", tags=["Recomendação"])
def cursos_por_habilidade(nome: str, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        result = session.run(
            """
            MATCH (curso:Curso)-[:ENSINA]->(h:Habilidade {nome: $nome})
            RETURN curso.id AS id, curso.nome AS nome, curso.plataforma AS plataforma
            ORDER BY curso.nome
            """,
            nome=nome
        )
        cursos = [dict(r) for r in result]
    return {"cursos": cursos}


@app.post("/perfil/{usuario_id}/habilidades", tags=["Perfil"])
def adicionar_habilidade(usuario_id: str, data: HabilidadeSchema, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        result = session.run(
            """
            MATCH (u:Usuario {id: $id})
            MATCH (h:Habilidade {nome: $nome})
            MERGE (u)-[:POSSUI]->(h)
            RETURN h.nome AS nome
            """,
            id=usuario_id,
            nome=data.nome
        ).single()
        if not result:
            raise HTTPException(status_code=404, detail=f"Habilidade '{data.nome}' não encontrada no banco")
    return {"mensagem": f"Habilidade '{data.nome}' adicionada"}


@app.get("/almejado/{usuario_id}", tags=["Perfil"])
def get_almejado(usuario_id: str, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        result = session.run(
            """
            MATCH (u:Usuario {id: $id})-[:ALMEJA]->(c:Cargo)
            RETURN c.id AS id, c.titulo AS titulo, c.nivel AS nivel,
                   c.salario_medio AS salario_medio
            """,
            id=usuario_id
        ).single()
    if not result:
        return {"almejado": None}
    return {"almejado": dict(result)}


@app.post("/almejar/{usuario_id}/{cargo_id}", tags=["Perfil"])
def almejar_cargo(usuario_id: str, cargo_id: str, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        session.run(
            """
            MATCH (u:Usuario {id: $uid})
            MATCH (c:Cargo {id: $cid})
            MERGE (u)-[:ALMEJA]->(c)
            """,
            uid=usuario_id, cid=cargo_id
        )
    return {"mensagem": "Carreira salva como objetivo"}


@app.delete("/perfil/{usuario_id}/habilidades/{nome}", tags=["Perfil"])
def remover_habilidade(usuario_id: str, nome: str, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        session.run(
            """
            MATCH (u:Usuario {id: $id})-[r:POSSUI]->(h:Habilidade {nome: $nome})
            DELETE r
            """,
            id=usuario_id,
            nome=nome
        )
    return {"mensagem": f"Habilidade '{nome}' removida"}


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
    with get_session() as session:
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.nome AS nome, u.perfil_atual AS perfil_atual",
            id=usuario_id
        ).single()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        habs_result = session.run(
            "MATCH (u:Usuario {id: $id})-[:POSSUI]->(h:Habilidade) RETURN h.nome AS nome",
            id=usuario_id
        )
        habilidades_usuario = [r["nome"] for r in habs_result]

        cargos_result = session.run(
            """
            MATCH (c:Cargo)-[:EXIGE]->(h:Habilidade)
            RETURN c.id AS id, c.titulo AS titulo, c.nivel AS nivel,
                   c.salario_medio AS salario_medio,
                   collect(h.nome) AS exigidas
            """
        )

        ranking = []
        for row in cargos_result:
            exigidas  = row["exigidas"]
            possuidas = [h for h in exigidas if h in habilidades_usuario]
            gaps      = [h for h in exigidas if h not in habilidades_usuario]
            score     = round(len(possuidas) / len(exigidas) * 100) if exigidas else 0
            ranking.append({
                "id":            row["id"],
                "titulo":        row["titulo"],
                "nivel":         row["nivel"],
                "salario_medio": row["salario_medio"],
                "exigidas":      exigidas,
                "possuidas":     possuidas,
                "gaps":          gaps,
                "match_score":   score,
            })

        ranking.sort(key=lambda x: x["match_score"], reverse=True)

    return {"usuario": dict(usuario), "total_cargos": len(ranking), "ranking": ranking}


# =============================================================================
# CURSOS
# =============================================================================
@app.get("/cursos/{usuario_id}", tags=["Recomendação"])
def recomendar_cursos(usuario_id: str, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.nome AS nome",
            id=usuario_id
        ).single()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        habs_result = session.run(
            "MATCH (u:Usuario {id: $id})-[:POSSUI]->(h:Habilidade) RETURN h.nome AS nome",
            id=usuario_id
        )
        habilidades_usuario = [r["nome"] for r in habs_result]

        cursos_result = session.run(
            """
            MATCH (curso:Curso)-[:ENSINA]->(h:Habilidade)
            RETURN curso.id AS id, curso.nome AS nome, curso.plataforma AS plataforma,
                   collect(h.nome) AS habilidades_ensinadas
            """
        )

        cursos = []
        for row in cursos_result:
            gaps_cobertos = [h for h in row["habilidades_ensinadas"] if h not in habilidades_usuario]
            if gaps_cobertos:
                cursos.append({
                    "id":                   row["id"],
                    "nome":                 row["nome"],
                    "plataforma":           row["plataforma"],
                    "habilidades_ensinadas": gaps_cobertos,
                    "gaps_cobertos":        len(gaps_cobertos),
                })

        cursos.sort(key=lambda x: x["gaps_cobertos"], reverse=True)

    return {"usuario": usuario["nome"], "total_cursos": len(cursos), "cursos": cursos}


# =============================================================================
# GRAFO
# =============================================================================
@app.get("/grafo/{usuario_id}", tags=["Visualização"])
def dados_grafo(usuario_id: str, atual=Depends(get_usuario_atual)):
    with get_session() as session:
        usuario = session.run(
            "MATCH (u:Usuario {id: $id}) RETURN u.id AS id, u.nome AS nome",
            id=usuario_id
        ).single()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        habs = session.run(
            "MATCH (u:Usuario {id: $id})-[:POSSUI]->(h:Habilidade) RETURN h.id AS id, h.nome AS nome, h.tipo AS tipo",
            id=usuario_id
        )
        habilidades = [dict(r) for r in habs]

        almejados_res = session.run(
            "MATCH (u:Usuario {id: $id})-[:ALMEJA]->(c:Cargo) RETURN c.id AS id, c.titulo AS titulo, c.nivel AS nivel, c.salario_medio AS salario_medio",
            id=usuario_id
        )
        almejados = [dict(r) for r in almejados_res]

        hab_nomes = [h["nome"] for h in habilidades]
        recomendados_res = session.run(
            """
            MATCH (c:Cargo)-[:EXIGE]->(h:Habilidade)
            WHERE h.nome IN $habs
            RETURN DISTINCT c.id AS id, c.titulo AS titulo, c.nivel AS nivel, c.salario_medio AS salario_medio
            LIMIT 6
            """,
            habs=hab_nomes
        )
        recomendados = [dict(r) for r in recomendados_res]

        nodes, links = [], []
        ids_adicionados = set()

        def add_node(node_id, label, node_type, extra=None):
            if node_id and node_id not in ids_adicionados:
                entry = {"id": node_id, "label": label, "type": node_type}
                if extra:
                    entry.update(extra)
                nodes.append(entry)
                ids_adicionados.add(node_id)

        u_id = usuario["id"]
        add_node(u_id, usuario["nome"], "usuario")

        for h in habilidades:
            h_id = h["id"] or h["nome"]
            add_node(h_id, h["nome"], "habilidade", {"tipo": h.get("tipo")})
            links.append({"source": u_id, "target": h_id, "label": "POSSUI"})

        for ca in almejados:
            add_node(ca["id"], ca["titulo"], "cargo_almejado")
            links.append({"source": u_id, "target": ca["id"], "label": "ALMEJA"})

        for cr in recomendados:
            add_node(cr["id"], cr["titulo"], "cargo_recomendado")
            for h in habilidades:
                h_id = h["id"] or h["nome"]
                links.append({"source": h_id, "target": cr["id"], "label": "EXIGE"})

    return {"nodes": nodes, "links": links}