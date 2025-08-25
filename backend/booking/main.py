from flask import Flask, request, jsonify
import mysql.connector
from datetime import datetime
from flask_cors import CORS
import requests

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
            INSERT INTO bookings (agentId, customerId, booking_date, booking_time)
            VALUES (%s, %s, %s, %s)
        """, (data["booking"]['agentId'], customer_id, data["booking"]['booking_date'], data["booking"]["booking_time"]))
        booking_id = cursor.lastrowid
        
        # Get agent details
        cursor.execute("SELECT * FROM field_agents WHERE agentId = %s", (data["booking"]['agentId'],))
        agent = cursor.fetchone()
        data["agent"] = agent

        conn.commit()
        notify_all_parties(data)
        return jsonify({
            "message": "Booking created successfully",
            "customerId": customer_id,
            "bookingId": booking_id,
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

# TODO: method to add booking to schedule
def add_to_schedule(booking_info):
    pass

def notify_all_parties(data):
    # send post request to /notification endpoint with a json payload
    try:
        payload = {
            'customer_name': data["customer"]['name'],
            'customer_email': data["customer"]['email'],
            'customer_phone': data['customer']['phone'],
            'agent_name': data['agent']['name'],
            'agent_email': data['agent']['email'],
            'agent_phone': data['agent']['phone'],
            'booking_date': data['booking']['booking_date'],
            'booking_time': data['booking']['booking_time'],
            'message': f"You have been scheduled with {data['agent']['name']} at {data['booking']['booking_date']} {data['booking']['booking_time']}."
        }

        print("Sending notification:", payload, flush=True)
        notification_endpoint = 'http://notification:5002/notification'
        response = requests.post(notification_endpoint, json=payload)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to notify via internal notification service: {e}")

if __name__ == "__main__":
    app.run(debug=True)
