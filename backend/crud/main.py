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

@app.route("/agent", methods=["PUT"])
def update_agent_status():
    try:
        data = request.get_json()

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # Update status of agent in fields_agents table
        cursor.execute("""
            UPDATE field_agents
            SET status = %s
            WHERE agentId = %s
        """, (data["status"], data["agentId"]))

        # Get customer email using booking_id from bookings table
        cursor.execute("""
            SELECT c.email, c.phone
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            WHERE b.bookingId = %s
        """, (data["booking_id"],))
        res = cursor.fetchone()

        # TODO: Send notification to customer

        conn.commit()
        return {"Agent_Status": data["status"], "customer_email": res["email"]}, 200

        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route("/booking", methods=["PUT"])
def update_booking_status():
    try:
        data = request.get_json()

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # Update status of agent in fields_agents table
        cursor.execute("""
            UPDATE bookings
            SET status = %s
            WHERE bookingId = %s
        """, (data["status"], data["booking_id"]))

        if data["status"] == "completed":
            # TODO: notify customer
            pass

        conn.commit()
        return {"Message": "Booking status updated"}, 200

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    app.run(debug=True)