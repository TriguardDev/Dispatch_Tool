from flask import Blueprint, request, jsonify
from db import get_connection
import datetime

booking_bp = Blueprint("booking", __name__)

@booking_bp.route("/booking", methods=["PUT"])
def update_booking_status():
    """
    Update booking status. If completed, trigger survey notifications.
    """
    try:
        data = request.get_json()
        booking_id = data.get("booking_id")
        new_status = data.get("status")

        if not booking_id or not new_status:
            return jsonify({"success": False, "error": "Missing fields"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            UPDATE bookings
            SET status = %s
            WHERE bookingId = %s
        """, (new_status, booking_id))

        cursor.execute("""
            SELECT c.email AS customer_email, c.phone AS customer_phone,
                   fa.email AS agent_email, fa.phone AS agent_phone
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            WHERE b.bookingId = %s
        """, (booking_id,))
        res = cursor.fetchone()

        if new_status == "completed":
            # Example: send survey link
            # TODO: notify customer
            pass

        conn.commit()
        return jsonify({"success": True, "message": "Booking updated"}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@booking_bp.route("/booking", methods=["GET"])
def get_bookings():
    """
    Get all bookings or bookings for a specific agent.
    """
    try:
        agentId = request.args.get("agentId")
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

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
            if isinstance(b["booking_date"], (datetime.date, datetime.datetime)):
                b["booking_date"] = b["booking_date"].isoformat()
            if isinstance(b["booking_time"], datetime.timedelta):
                total_seconds = int(b["booking_time"].total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                b["booking_time"] = f"{hours:02}:{minutes:02}:{seconds:02}"

        return jsonify(bookings), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@booking_bp.route("/booking", methods=["POST"])
def create_booking():
    """
    Create a new booking, inserting location + customer if new.
    """
    try:
        data = request.get_json()

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Location lookup/insert
        cursor.execute("""
            SELECT id FROM locations 
            WHERE street_number=%s AND street_name=%s AND postal_code=%s 
              AND city=%s AND state_province=%s
        """, (
            data["location"]["street_number"],
            data["location"]["street_name"],
            data["location"]["postal_code"],
            data["location"]["city"],
            data["location"]["state_province"]
        ))
        existing_location = cursor.fetchone()
        location_id = existing_location["id"] if existing_location else None

        if not location_id:
            cursor.execute("""
                INSERT INTO locations (latitude, longitude, postal_code, city, state_province, country, street_name, street_number)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
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

        # Customer lookup/insert
        cursor.execute("SELECT customerId FROM customers WHERE email = %s", (data["customer"]["email"],))
        existing_customer = cursor.fetchone()
        customer_id = existing_customer["customerId"] if existing_customer else None

        if not customer_id:
            cursor.execute("""
                INSERT INTO customers (name, email, phone, location_id)
                VALUES (%s,%s,%s,%s)
            """, (
                data["customer"]["name"],
                data["customer"]["email"],
                data["customer"]["phone"],
                location_id
            ))
            customer_id = cursor.lastrowid

        # Booking insert
        cursor.execute("""
            INSERT INTO bookings (agentId, customerId, booking_date, booking_time)
            VALUES (%s,%s,%s,%s)
        """, (
            data["booking"]["agentId"],
            customer_id,
            data["booking"]["booking_date"],
            data["booking"]["booking_time"]
        ))
        booking_id = cursor.lastrowid

        conn.commit()
        return jsonify({
            "success": True,
            "message": "Booking created",
            "customerId": customer_id,
            "bookingId": booking_id
        }), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
