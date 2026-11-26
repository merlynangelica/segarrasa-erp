import os
from flask import Flask, jsonify, render_template, session
from dotenv import load_dotenv
from .db import init_db, seed_db

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.json.sort_keys = False  # pertahankan urutan kolom sesuai query
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-only-change-me")
    app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024  # batas upload file restore database
    # Path relatif dihitung dari folder proyek (bukan folder terminal), agar database yang sama
    # selalu dipakai baik di laptop maupun di server.
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.getenv("DATABASE_PATH", "instance/segarrasa_erp.db")
    app.config["DATABASE"] = db_path if os.path.isabs(db_path) else os.path.join(root, db_path)
    app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "0") == "1"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "0") == "1"
    os.makedirs(os.path.dirname(app.config["DATABASE"]) or ".", exist_ok=True)
    init_db(app)
    with app.app_context():
        seed_db()
    from .routes import bp
    app.register_blueprint(bp)

    @app.get("/")
    def index():
        static = os.path.join(app.root_path, "static")
        v = int(max(os.path.getmtime(os.path.join(static, f)) for f in ("app.js", "style.css")))
        resp = app.make_response(render_template("index.html", v=v))
        resp.headers["Cache-Control"] = "no-cache"
        return resp

    @app.get("/api/session")
    def current_session():
        if not session.get("user_id"):
            return jsonify({"authenticated": False})
        return jsonify({"authenticated": True, "user": session.get("user")})

    return app
