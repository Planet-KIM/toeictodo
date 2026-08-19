from flask import Flask
from config import Config
from routes.main_routes import main_bp
from routes.api_routes import api_bp
from services.db_service import DbService

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)

    # Initialize SQLite Database & Auto-Seed from Excel on first run
    DbService.init_db()

    # Register Modular Flask Blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    print("=" * 50)
    print("🚀 TOEIC 750 Flask App (SQLite Database Modularized)")
    print(f"🌐 Access URL: http://localhost:{Config.PORT}")
    print("=" * 50)
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
