"""Entry point untuk server produksi (PythonAnywhere, gunicorn, dsb.).

    gunicorn wsgi:app
"""
from app import create_app

app = create_app()
