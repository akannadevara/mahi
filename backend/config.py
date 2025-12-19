import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')

    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', 'anil@123')
    MYSQL_DB = os.getenv('MYSQL_DB', 'avk_events')

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 50 * 1024 * 1024))

    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true','1','yes')
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() in ('true','1','yes')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'akannadevara@gmail.com')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', 'qdmikwgdhrbtwmkd')

    