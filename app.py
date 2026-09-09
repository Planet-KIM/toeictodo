import time
import traceback
from flask import Flask, request, jsonify, g
from config import Config
from routes.main_routes import main_bp
from routes.api_routes import api_bp
from services.db_service import DbService
from utils.logger import setup_logger, get_logger

logger = get_logger('toeictodo')

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)

    # Initialize Application Rotating File Logger
    setup_logger(app)

    # Initialize SQLite Database & Auto-Seed from Excel on first run
    DbService.init_db()

    # Register Modular Flask Blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)

    # HTTP Request Timing Middleware
    @app.before_request
    def before_request():
        g.start_time = time.time()

    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            elapsed_ms = (time.time() - g.start_time) * 1000
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            logger.info(f"[HTTP] {request.method} {request.path} -> {response.status_code} ({elapsed_ms:.1f}ms) - IP: {client_ip}")
        return response

    # Global Exception Handler (500 Error Log & Traceback Capture)
    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        tb_str = traceback.format_exc()
        logger.error(f"[Unhandled Exception] {request.method} {request.path} - IP: {client_ip}\nException: {str(e)}\n{tb_str}")
        return jsonify({
            'success': False,
            'error': 'Internal server error occurred.',
            'detail': str(e) if Config.DEBUG else 'Please check app logs.'
        }), 500

    return app

if __name__ == '__main__':
    app = create_app()
    logger.info("=" * 50)
    logger.info("🚀 TOEIC 750 Flask App Started with Application Logging System")
    logger.info(f"🌐 Access URL: http://localhost:{Config.PORT}")
    logger.info("=" * 50)
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
