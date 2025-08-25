from flask import Flask, request, jsonify
import mysql.connector
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

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        query = """
        (
            SELECT customerId AS id, 'customer' AS user_type
            FROM customers
            WHERE email = %s
        )
        UNION
        (
            SELECT agentId AS id, 'agent' AS user_type
            FROM field_agents
            WHERE email = %s
        )
        """

        cursor.execute(query, (email, email))
        result = cursor.fetchone()

        if result:
            return {
                "Login": "Successful",
                "id": result["id"],
                "user_type": result["user_type"]
            }, 200
        else:
            return {"error": "Email not found"}, 404

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    app.run(debug=True)