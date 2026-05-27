import os
import ssl
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import AuthError, ServiceUnavailable

# Carrega o arquivo .env
load_dotenv()

URI = os.getenv("NEO4J_URI")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

# 🔥 Captura o nome da database do seu arquivo .env
DATABASE_NAME = os.getenv("NEO4J_DATABASE", "da62a0bf").strip()

_driver = None

def get_driver():
    global _driver
    if _driver is None:
        # Para neo4j+ssc://, o SSL é gerenciado automaticamente pelo driver
        # Não use ssl_context com esses schemes
        if URI.startswith("neo4j+ssc://") or URI.startswith("neo4j+s://"):
            _driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))
        else:
            # Para schemes bolt/neo4j locais, aplique contexto SSL se necessário
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            _driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD), ssl_context=ssl_context)
    return _driver

def get_session():
    # 🔥 Força a sessão a abrir especificamente na database configurada no .env
    return get_driver().session(database=DATABASE_NAME)

def close_driver():
    global _driver
    if _driver:
        _driver.close()
        _driver = None

def verify_connection():
    try:
        get_driver().verify_connectivity()
        print(f"✅ Conexão estabelecida com o Neo4j AuraDB (Database: {DATABASE_NAME}) com sucesso!")
        return True
    except AuthError:
        raise RuntimeError("❌ Credenciais inválidas. Verifique USERNAME e PASSWORD no .env")
    except ServiceUnavailable as e:
        raise RuntimeError(f"❌ Banco indisponível: {e}")