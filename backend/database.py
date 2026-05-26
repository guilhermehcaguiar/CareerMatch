"""
database.py — Gerencia a conexão com o Neo4j AuraDB
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import AuthError, ServiceUnavailable

load_dotenv()

URI      = os.getenv("NEO4J_URI")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))
    return _driver


def get_session():
    return get_driver().session()


def close_driver():
    global _driver
    if _driver:
        _driver.close()
        _driver = None


def verify_connection():
    try:
        get_driver().verify_connectivity()
        return True
    except AuthError:
        raise RuntimeError("❌ Credenciais inválidas. Verifique USERNAME e PASSWORD no .env")
    except ServiceUnavailable as e:
        raise RuntimeError(f"❌ Banco indisponível: {e}")