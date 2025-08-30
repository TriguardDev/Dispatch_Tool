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
        
        return {"Endpoint": "Changed"}, 200

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
