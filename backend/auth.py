import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

# =============================================================================
# CONFIGURAÇÕES JWT
# =============================================================================
# Em produção, use uma chave secreta forte e armazene no .env
SECRET_KEY  = os.getenv("SECRET_KEY", "career-match-secret-key-2024")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = 8
# Contexto bcrypt para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =============================================================================
# SENHA
# =============================================================================

def hash_senha(senha: str) -> str:
    """Gera o hash bcrypt da senha limitando a 72 caracteres para evitar Erro 500."""
    senha_limitada = senha[:72]
    return pwd_context.hash(senha_limitada)


def verificar_senha(senha_plain: str, senha_hash: str) -> bool:
    """Compara senha em texto plano (limitada a 72 chars) com o hash armazenado."""
    senha_limitada = senha_plain[:72]
    return pwd_context.verify(senha_limitada, senha_hash)


# =============================================================================
# JWT
# =============================================================================

def criar_token(data: dict) -> str:
    """
    Gera um token JWT com expiração.
    O payload inclui os dados do usuário + campo 'exp' (expiração).
    """
    payload = data.copy()
    expira  = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload.update({"exp": expira})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def validar_token(token: str) -> dict:
    """
    Decodifica e valida o token JWT.
    Lança ValueError se inválido ou expirado.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise ValueError("Token inválido ou expirado")