# ==========================================================================
# Logger Utility Module - Rotating File Logger & Formatter
# ==========================================================================

import os
import logging
from logging.handlers import RotatingFileHandler

def setup_logger(app=None):
    """
    Sets up application-wide logging with RotatingFileHandlers:
    - logs/app.log: Captures INFO, WARNING, ERROR logs (10MB x 5 backups)
    - logs/error.log: Captures ERROR and CRITICAL logs with tracebacks (10MB x 5 backups)
    - StreamHandler: Standard output formatted for console
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logs_dir = os.path.join(base_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    app_log_path = os.path.join(logs_dir, 'app.log')
    error_log_path = os.path.join(logs_dir, 'error.log')

    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Root Logger Config
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Clear any existing handlers to prevent duplicated logs
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # 1. Combined App Log Handler (INFO+)
    app_handler = RotatingFileHandler(
        app_log_path, maxBytes=10 * 1024 * 1024, backupCount=5, encoding='utf-8'
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(formatter)
    root_logger.addHandler(app_handler)

    # 2. Error Log Handler (ERROR+)
    error_handler = RotatingFileHandler(
        error_log_path, maxBytes=10 * 1024 * 1024, backupCount=5, encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root_logger.addHandler(error_handler)

    # 3. Console Stream Handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    if app:
        app.logger.handlers = root_logger.handlers
        app.logger.setLevel(root_logger.level)

    logger = logging.getLogger('toeictodo')
    logger.info('=== TOEIC Todo Application Logger Initialized Successfully ===')
    return logger

def get_logger(name='toeictodo'):
    return logging.getLogger(name)
