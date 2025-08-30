from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS
import datetime
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
            # TODO: send customer surveys
            pass
        
        # Using bookingId, get customer and agent information
        cursor.execute("""
            SELECT c.email AS customer_email, c.phone AS customer_phone,
                   fa.email AS agent_email, fa.phone AS agent_phone
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            WHERE b.bookingId = %s
        """, (data["booking_id"],))
        res = cursor.fetchone()
        print(res, flush=True)
        notify_customer(res)
          
        conn.commit()
        return {"Message": "Booking status updated"}, 200

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route("/booking", methods=["GET"])
def get_bookings():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        agentId = request.args.get('agentId')
        query = ""
        
        if (agentId):
            # Find all bookings where bookings.agentId = agentId
            query = """
                SELECT b.bookingId, b.booking_date, b.booking_time, b.status,
                      c.name AS customer_name,
                      fa.name AS agent_name
                FROM bookings b
                JOIN customers c ON b.customerId = c.customerId
                LEFT JOIN field_agents fa ON b.agentId = fa.agentId
                WHERE b.agentId = %s
            """
            cursor.execute(query, (agentId,))
        else:
            query = """
                SELECT b.bookingId, b.booking_date, b.booking_time, b.status,
                      c.name AS customer_name,
                      fa.name AS agent_name
                FROM bookings b
                JOIN customers c ON b.customerId = c.customerId
                LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            """
            cursor.execute(query,)

        bookings = cursor.fetchall()

        for b in bookings:
            # booking_date as string
            if isinstance(b['booking_date'], (datetime.date, datetime.datetime)):
                b['booking_date'] = b['booking_date'].isoformat()  # YYYY-MM-DD
            # booking_time as string
            if isinstance(b['booking_time'], datetime.timedelta):
                total_seconds = int(b['booking_time'].total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                b['booking_time'] = f"{hours:02}:{minutes:02}:{seconds:02}"  # HH:MM:SS

        return jsonify(bookings), 200

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def notify_customer(data):
    try:
        payload = {
            'customer_name': data.get("customer", {}).get("name", ""),
            'customer_email': data.get("customer", {}).get("email", ""),
            'customer_phone': data.get("customer", {}).get("phone", ""),
            'agent_name': data.get("agent", {}).get("name", ""),
            'agent_email': data.get("agent", {}).get("email", ""),
            'agent_phone': data.get("agent", {}).get("phone", ""),
            'booking_date': data.get("booking", {}).get("booking_date", ""),
            'booking_time': data.get("booking", {}).get("booking_time", ""),
            'message': f"{data.get('agent', {}).get('name', '')} is on their way."
        }

        print("Sending notification:", payload, flush=True)
        notification_endpoint = 'http://notification:5002/notification'
        response = requests.post(notification_endpoint, json=payload)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to notify via internal notification service: {e}")

@app.route("/booking", methods=["POST"])
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

def find_lat_long(address):
    # Use nominatism api to find latitude and longitude, given an address
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'postcalcode': address.get("postcal_code", ""),
            'street': f"{address.get('street_number', '')} {address.get('street_name', '')}",
            'format': 'json'
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
        else:
            raise ValueError("No results found for the given address.")
    except Exception as e:
        print(f"Error fetching lat/long: {e}")
        return None, None

if __name__ == "__main__":
    app.run(debug=True)