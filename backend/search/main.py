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
        booking_date = request.args.get('booking_date')
        booking_time = request.args.get('booking_time')
        booking_period = '02:00:00'
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Build query based on whether postal_code is provided
        if postal_code:
            # Get user's lat/long
            cursor.execute("SELECT latitude, longitude FROM locations WHERE postal_code = %s", (postal_code,))
            location = cursor.fetchone()
            
            query = """
                SELECT fa.*, l.latitude, l.longitude,
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
                      AND b.booking_time BETWEEN %s AND ADDTIME(%s, %s)
                )
                HAVING distance <= 50
                ORDER BY distance ASC;
            """

            cursor.execute(query, (location["latitude"], location["longitude"], location["latitude"], booking_date, booking_time, booking_time, booking_period))
        else:
            # Return all agents if no postal code specified
            cursor.execute("SELECT * FROM field_agents")
        
        agents = cursor.fetchall()
        return jsonify(agents), 200

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    app.run(debug=True)