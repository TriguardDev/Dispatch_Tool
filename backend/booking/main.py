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
        data = request.get_json()

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # Create entry into location table
        cursor.execute("""
            INSERT INTO locations (latitude, longitude, postal_code, street_name, street_number)
            VALUES (%s, %s, %s, %s, %s)
        """, (data["location"]['latitude'], data["location"]['longitude'], data["location"]['postal_code'], data["location"]['street_name'], data["location"]['street_number']))
        location_id = cursor.lastrowid

        # Create entry into customers table
        cursor.execute("""
            INSERT INTO customers (name, email, phone, location_id)
            VALUES (%s, %s, %s, %s)
        """, (data["customer"]['name'], data["customer"]['email'], data["customer"]['phone'], location_id))
        
        customer_id = cursor.lastrowid

        # Create new booking
        cursor.execute("""
            INSERT INTO bookings (agentId, customerId, booking_date)
            VALUES (%s, %s, %s)
        """, (data['agentId'], customer_id, data['booking_date']))
        booking_id = cursor.lastrowid
        
        conn.commit()

        return jsonify({
            "message": "Booking created successfully",
            "customerId": customer_id,
            "bookingId": booking_id,
            "bookingStatus": "confirmed"
        }), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
     
        return jsonify({"error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    app.run(debug=True)
