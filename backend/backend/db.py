import mysql.connector
from mysql.connector import pooling
from config import Config

# Create a connection pool once and reuse across requests
db_pool = pooling.MySQLConnectionPool(
    pool_name=Config.MYSQL_POOL_NAME,
    pool_size=Config.MYSQL_POOL_SIZE,
    pool_reset_session=True,
    host=Config.MYSQL_HOST,
    port=Config.MYSQL_PORT,
    user=Config.MYSQL_USER,
    password=Config.MYSQL_PASSWORD,
    database=Config.MYSQL_DB
)

def get_connection():
    """Get a connection from the pool."""
    return db_pool.get_connection()
