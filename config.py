import os

class Config:
    PORT = int(os.environ.get('PORT', 5000))
    HOST = os.environ.get('HOST', '127.0.0.1')
    DEBUG = True
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_DIR = os.path.join(BASE_DIR, 'static')
    EXCEL_FILE = os.path.join(BASE_DIR, 'TOEIC_750_2025-2026_형용사_부사_550_예문_보강완성.xlsx')
    DB_FILE = os.path.join(BASE_DIR, 'toeic.db')

    # SSL Certificate Settings
    SSL_CERT = os.path.join(BASE_DIR, 'cert.pem')
    SSL_KEY = os.path.join(BASE_DIR, 'key.pem')
    USE_SSL = os.path.exists(SSL_CERT) and os.path.exists(SSL_KEY) and os.environ.get('DIRECT_FLASK_SSL', 'false').lower() == 'true'


