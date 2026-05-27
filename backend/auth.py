import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key")
ALGORITHM = "HS256"

def hash_senha(senha: str) -> str:
    senha_bytes = senha.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha_bytes, salt).decode('utf-8')

def verificar_senha(senha_pura: str, senha_criptografada: str) -> bool:
    try:
        return bcrypt.checkpw(senha_pura.encode('utf-8'), senha_criptografada.encode('utf-8'))
    except Exception:
        return False

def criar_token(dados: dict) -> str:
    dados_copia = dados.copy()
    expiracao = datetime.utcnow() + timedelta(hours=8)
    dados_copia.update({"exp": expiracao})
    return jwt.encode(dados_copia, SECRET_KEY, algorithm=ALGORITHM)

def validar_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expirado")
    except jwt.InvalidTokenError:
        raise ValueError("Token inválido")