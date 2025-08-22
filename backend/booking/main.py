from flask import Flask, request, jsonify
import mysql.connector
from datetime import datetime

app = Flask(__name__)

# Configure MySQL connection (match your docker-compose settings!)
db_config = {
    "host": "dev-database",   # the container_name or service name of your MySQL container
    "user": "admin",
    "password": "admin5683!",
    "database": "dev",
    "port": 3306
}

@app.route("/book", methods=["POST"])
def book_agent():
    try:
        # Get postal code from query parameters
        postal_code = request.args.get('postal_code')
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        return {"message": "received"}, 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    app.run(debug=True)
