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

@app.route("/search", methods=["GET"])
def search_agents():
    try:
        # Get postal code from query parameters
        postal_code = request.args.get('postal_code')
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Build query based on whether postal_code is provided
        if postal_code:
            query = """
                SELECT fa.*, l.postal_code
                FROM field_agents fa
                INNER JOIN locations l ON fa.location_id = l.id
                WHERE l.postal_code = %s
            """

            cursor.execute(query, (postal_code,))
        else:
            # Return all agents if no postal code specified
            cursor.execute("SELECT * FROM field_agents")
        
        agents = cursor.fetchall()
        return jsonify(agents), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    app.run(debug=True)
