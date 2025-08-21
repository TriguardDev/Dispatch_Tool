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

@app.route("/add_booking", methods=["POST"])
def add_booking():
    try:
        data = request.json
        customerId = data.get("customerId")
        agentId = data.get("agentId")
        booking_date = data.get("booking_date")  # should be a string like '2025-08-22 09:00:00'
        status = data.get("status", "pending")   # default if not provided

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        sql = """
        INSERT INTO bookings (customerId, agentId, booking_date, status)
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (customerId, agentId, booking_date, status))
        conn.commit()

        return jsonify({"message": "Booking added successfully!", "bookingId": cursor.lastrowid}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    app.run(debug=True)
