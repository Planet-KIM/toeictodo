import os

class Config:
    PORT = 7071
    HOST = '0.0.0.0'
    DEBUG = True
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_DIR = os.path.join(BASE_DIR, 'static')
    EXCEL_FILE = os.path.join(BASE_DIR, 'TOEIC_750_2025-2026_형용사_부사_550_예문_보강완성.xlsx')
    DB_FILE = os.path.join(BASE_DIR, 'toeic.db')
