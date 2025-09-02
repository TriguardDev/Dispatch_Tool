from flask import Flask, request, jsonify
import mysql.connector
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configure MySQL connection (match your docker-compose settings!)
db_config = {
    "host": "dev-database",   # the container_name or service name of your MySQL container
    "user": "admin",
    "password": "admin5683!",
    "database": "dev",
    "port": 3306
}

if __name__ == "__main__":
    app.run(debug=True)