from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS
import datetime
import requests
import uuid

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
                      SELECT 
                          b.bookingId, 
                          b.booking_date, 
                          b.booking_time, 
                          b.status,
                          c.name AS customer_name,
                          fa.name AS agent_name,
                          d.dispositionId AS disposition_id,
                          d.typeCode AS disposition_code,
                          d.note AS disposition_note,
                          dt.description AS disposition_description,
                          CONCAT(
                              l.street_number, ' ', 
                              l.street_name, ', ', 
                              l.postal_code, ' ', 
                              l.city
                          ) AS customer_address
                      FROM bookings b
                      JOIN customers c 
                          ON b.customerId = c.customerId
                      LEFT JOIN field_agents fa 
                          ON b.agentId = fa.agentId
                      LEFT JOIN dispositions d
                          ON b.dispositionId = d.dispositionId
                      LEFT JOIN disposition_types dt
                          ON d.typeCode = dt.typeCode
                      LEFT JOIN locations l
                          ON c.location_id = l.id
                      WHERE b.agentId = %s;
            """
            cursor.execute(query, (agentId,))
        else:
            query = """
                SELECT b.bookingId, b.booking_date, b.booking_time, b.status,
                      c.name AS customer_name,
                      fa.name AS agent_name,
                      d.dispositionId AS disposition_id,
                      d.typeCode AS disposition_code,
                      d.note AS disposition_note,
                      dt.description AS disposition_description,
                      CONCAT(
                          l.street_number, ' ', 
                          l.street_name, ', ', 
                          l.postal_code, ' ', 
                          l.city
                      ) AS customer_address
                FROM bookings b
                JOIN customers c ON b.customerId = c.customerId
                LEFT JOIN field_agents fa ON b.agentId = fa.agentId
                LEFT JOIN dispositions d ON b.dispositionId = d.dispositionId
                LEFT JOIN disposition_types dt ON d.typeCode = dt.typeCode
                LEFT JOIN locations l ON c.location_id = l.id;
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

@app.route("/booking", methods=["POST"])
def book_agent():
    try:
        data = request.get_json()

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)       
        
        # Check if location already exists
        cursor.execute("""
            SELECT id FROM locations 
            WHERE street_number = %s 
              AND street_name = %s 
              AND postal_code = %s 
              AND city = %s 
              AND state_province = %s
        """, (
            data["location"]["street_number"],
            data["location"]["street_name"],
            data["location"]["postal_code"],
            data["location"]["city"],
            data["location"]["state_province"]
        ))

        existing_location = cursor.fetchone()
        location_id = None
        if existing_location:
            location_id = existing_location["id"]
        else:
            cursor.execute("""
                INSERT INTO locations (latitude, longitude, postal_code, city, state_province, country, street_name, street_number)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data["location"]["latitude"],
                data["location"]["longitude"],
                data["location"]["postal_code"],
                data["location"]["city"],
                data["location"]["state_province"],
                data["location"]["country"],
                data["location"]["street_name"],
                data["location"]["street_number"]
            ))
            location_id = cursor.lastrowid 

        # Check if customer already exists
        cursor.execute("SELECT customerId FROM customers WHERE email = %s", (data["customer"]["email"],))
        existing_customer = cursor.fetchone()
        customer_id = None
        if existing_customer:
            customer_id = existing_customer["customerId"]
        else:
            # Insert new customer
            cursor.execute("""
                INSERT INTO customers (name, email, phone, location_id)
                VALUES (%s, %s, %s, %s)
            """, (data["customer"]["name"], data["customer"]["email"], data["customer"]["phone"], location_id))
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

@app.route("/disposition", methods=["POST"])
def add_disposition():
    try:
        data = request.get_json()
        booking_id = data.get("bookingId")
        disposition_type = data.get("dispositionType")
        note = data.get("note")

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # 1. Check if booking already has a disposition
        cursor.execute("SELECT dispositionId FROM bookings WHERE bookingId = %s", (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            return jsonify({"error": f"Booking {booking_id} not found"}), 404

        disposition_id = booking.get("dispositionId")

        if disposition_id:
            # 2a. Update existing disposition
            update_query = """
                UPDATE dispositions
                SET typeCode = %s, note = %s
                WHERE dispositionId = %s
            """
            cursor.execute(update_query, (disposition_type, note, disposition_id))
        else:
            # 2b. Create new disposition
            insert_query = """
                INSERT INTO dispositions (typeCode, note)
                VALUES (%s, %s)
            """
            cursor.execute(insert_query, (disposition_type, note))
            new_disposition_id = cursor.lastrowid

            # Update booking to point to this new disposition
            cursor.execute(
                "UPDATE bookings SET dispositionId = %s WHERE bookingId = %s",
                (new_disposition_id, booking_id)
            )

        conn.commit()
        return jsonify({"message": "Disposition saved successfully"}), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()       

@app.route("/search", methods=["GET"])
def search_agents():
    try:
        # Get lat/lon from query parameters
        lat = float(request.args.get('latitude'))
        lon = float(request.args.get('longitude'))
        booking_date = request.args.get('booking_date')
        booking_time = request.args.get('booking_time')
        booking_period = '02:00:00'
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True, buffered=True)

        # Build query based on whether postal_code is provided
        if lat and lon:           
            query = """
                SELECT fa.name, fa.agentId,
                    (6371 * ACOS(
                        COS(RADIANS(%s)) * COS(RADIANS(l.latitude)) *
                        COS(RADIANS(l.longitude) - RADIANS(%s)) +
                        SIN(RADIANS(%s)) * SIN(RADIANS(l.latitude))
                    )) AS distance
                FROM field_agents fa
                INNER JOIN locations l ON fa.location_id = l.id
                WHERE fa.agentId NOT IN (
                    SELECT b.agentId
                    FROM bookings b
                    WHERE b.booking_date = %s
                      AND b.booking_time BETWEEN SUBTIME(%s, %s) AND ADDTIME(%s, %s)
                )
                ORDER BY distance ASC;
            """

            cursor.execute(query, (lat, lon, lat, booking_date, booking_time, booking_period, booking_time, booking_period))
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

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        query = """
        (
            SELECT dispatcherId AS id, 'dispatcher' AS user_type
            FROM dispatchers
            WHERE email = %s AND password = %s
        )
        UNION
        (
            SELECT agentId AS id, 'agent' AS user_type
            FROM field_agents
            WHERE email = %s AND password = %s
        )
        """

        cursor.execute(query, (email, password, email, password))
        result = cursor.fetchone()

        if result:
            return {
                "Login": "Successful",
                "id": result["id"],
                "user_type": result["user_type"],
                "token": str(uuid.uuid4())
            }, 200
        else:
            return {"error": "Email or password incorrect"}, 404

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