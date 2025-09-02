import os

class Config:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "dev-database")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER = os.getenv("MYSQL_USER", "admin")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "admin5683!")
    MYSQL_DB = os.getenv("MYSQL_DB", "dev")
    MYSQL_POOL_NAME = "mypool"
    MYSQL_POOL_SIZE = int(os.getenv("MYSQL_POOL_SIZE", 5))
