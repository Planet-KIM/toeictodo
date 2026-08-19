from flask import Blueprint, send_from_directory
from config import Config

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return send_from_directory(Config.STATIC_DIR, 'index.html')

@main_bp.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(Config.STATIC_DIR, filename)
