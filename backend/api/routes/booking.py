from flask import Blueprint, request, jsonify
from db import get_connection
from utils.notifier import send_sms, send_email
from utils.middleware import require_auth, require_dispatcher
import datetime

booking_bp = Blueprint("booking", __name__, url_prefix="/api")

def serialize_booking_timestamps(booking):
    """Convert booking timestamps to ISO format for JSON serialization"""
    if isinstance(booking["booking_date"], (datetime.date, datetime.datetime)):
        booking["booking_date"] = booking["booking_date"].isoformat()
    if isinstance(booking["booking_time"], datetime.timedelta):
        total_seconds = int(booking["booking_time"].total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        booking["booking_time"] = f"{hours:02}:{minutes:02}:{seconds:02}"
    return booking

@booking_bp.route("/booking", methods=["PUT"])
@require_auth
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

        # Verify user has access to this booking
        if request.role == 'field_agent':
            cursor.execute("""
                SELECT bookingId FROM bookings 
                WHERE bookingId = %s AND agentId = %s
            """, (booking_id, request.user_id))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Access denied"}), 403

        cursor.execute("""
            UPDATE bookings
            SET status = %s
            WHERE bookingId = %s
        """, (new_status, booking_id))

        cursor.execute("""
            SELECT c.email AS customer_email, c.phone AS customer_phone, c.name AS customer_name,
                   fa.email AS agent_email, fa.phone AS agent_phone, fa.name AS agent_name,
                   b.booking_date, b.booking_time
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            WHERE b.bookingId = %s
        """, (booking_id,))
        res = cursor.fetchone()

        if not res:
            return jsonify({"success": False, "error": "Booking not found"}), 404

        conn.commit()

        # -------------------- Notifications -------------------- #
        # Customer notification
        customer_message = (
            f"Hi {res['customer_name']}, the status of your booking on "
            f"{res['booking_date']} at {res['booking_time']} has been updated to '{new_status}'."
        )

        # Send Email
        if res.get("customer_email"):
          send_email(
              to_email=res['customer_email'],
              subject="Booking Status Updated",
              html_body=f"<p>{customer_message}</p>",
          )

        # Send SMS
        if res.get("customer_phone"):
            send_sms(res['customer_phone'], customer_message)

        # Agent notification
        if res.get("agent_name"):
            agent_message = (
                f"Hi {res['agent_name']}, the status of booking with "
                f"{res['customer_name']} on {res['booking_date']} at {res['booking_time']} "
                f"has been updated to '{new_status}'."
            )

            # Send SMS
            if res.get("agent_phone"):
                send_sms(res['agent_phone'], agent_message)

            # Send Email
            if res.get("agent_email"):
                send_email(
                    to_email=res['agent_email'],
                    subject="Booking Status Updated",
                    html_body=f"<p>{agent_message}</p>"
                )

        # TODO: send survey link if completed
        return jsonify({"success": True, "message": "Booking updated"}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@booking_bp.route("/bookings", methods=["GET"])
@require_auth
def get_all_bookings():
    """
    Get all bookings (dispatcher/admin access only).
    """
    try:
        # Only dispatchers and admins can see all bookings
        if request.role == 'field_agent':
            return jsonify({"success": False, "error": "Access denied - use /agents/{agentId}/bookings for agent bookings"}), 403
              
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

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
          LEFT JOIN locations l ON c.location_id = l.id
          ORDER BY b.booking_date, b.booking_time;
        """
        cursor.execute(query)

        bookings = cursor.fetchall()

        # Serialize timestamps for all bookings
        for booking in bookings:
            serialize_booking_timestamps(booking)

        return jsonify({"success": True, "data": bookings}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@booking_bp.route("/agents/<int:agent_id>/bookings", methods=["GET"])
@require_auth
def get_agent_bookings(agent_id):
    """
    Get all bookings for a specific agent. Agents can only see their own bookings.
    """
    try:
        # Agents can only see their own bookings
        if request.role == 'field_agent' and request.user_id != agent_id:
            return jsonify({"success": False, "error": "Access denied - can only view your own bookings"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Verify agent exists
        cursor.execute("SELECT agentId FROM field_agents WHERE agentId = %s", (agent_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Agent not found"}), 404

        # Find all bookings where bookings.agentId = agent_id
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
          WHERE b.agentId = %s
          ORDER BY b.booking_date, b.booking_time;
        """
        cursor.execute(query, (agent_id,))

        bookings = cursor.fetchall()

        # Serialize timestamps for all bookings
        for booking in bookings:
            serialize_booking_timestamps(booking)

        return jsonify({"success": True, "data": bookings}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@booking_bp.route("/bookings/<int:booking_id>", methods=["GET"])
@require_auth
def get_booking(booking_id):
    """
    Get a specific booking by ID.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # If user is an agent, they can only see their own bookings
        if request.role == 'field_agent':
            query = """
                SELECT 
                    b.bookingId, 
                    b.booking_date, 
                    b.booking_time, 
                    b.status,
                    c.name AS customer_name,
                    c.email AS customer_email,
                    c.phone AS customer_phone,
                    fa.name AS agent_name,
                    fa.email AS agent_email,
                    fa.phone AS agent_phone,
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
                WHERE b.bookingId = %s AND b.agentId = %s
            """
            cursor.execute(query, (booking_id, request.user_id))
        else:
            # Dispatchers and admins can see any booking
            query = """
                SELECT 
                    b.bookingId, 
                    b.booking_date, 
                    b.booking_time, 
                    b.status,
                    c.name AS customer_name,
                    c.email AS customer_email,
                    c.phone AS customer_phone,
                    fa.name AS agent_name,
                    fa.email AS agent_email,
                    fa.phone AS agent_phone,
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
                LEFT JOIN locations l ON c.location_id = l.id
                WHERE b.bookingId = %s
            """
            cursor.execute(query, (booking_id,))

        booking = cursor.fetchone()

        if not booking:
            return jsonify({"success": False, "error": "Booking not found"}), 404

        # Serialize timestamps
        serialize_booking_timestamps(booking)

        return jsonify({"success": True, "data": booking}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@booking_bp.route("/bookings", methods=["POST"])
@require_dispatcher  # Only dispatchers can create bookings
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

        # Fetch agent info
        cursor.execute("SELECT name, email, phone FROM field_agents WHERE agentId=%s", (data["booking"]["agentId"],))
        agent = cursor.fetchone()

        conn.commit()

        # -------------------- Notifications -------------------- #
        # Customer notification
        customer_message = (
            f"Hi {data['customer']['name']}, your booking with {agent['name']} "
            f"on {data['booking']['booking_date']} at {data['booking']['booking_time']} has been confirmed."
        )
        
        # Send SMS
        if data['customer'].get("phone"):
            send_sms(data['customer']['phone'], customer_message)
        # Send Email
        if data['customer'].get("email"):
            send_email(
                to_email=data['customer']['email'],
                subject="Booking Confirmation",
                html_body=f"<p>{customer_message}</p>"
            )

        # Agent notification
        agent_message = (
            f"Hi {agent['name']}, you have a new booking with {data['customer']['name']} "
            f"on {data['booking']['booking_date']} at {data['booking']['booking_time']}."
        )

        # Send SMS
        if agent.get("phone"):
            send_sms(agent['phone'], agent_message)
        # Send Email
        if agent.get("email"):
            send_email(
                to_email=agent['email'],
                subject="New Booking Assigned",
                html_body=f"<p>{agent_message}</p>"
            )

        # Fetch the created booking with full details
        cursor.execute("""
            SELECT 
                b.bookingId, 
                b.booking_date, 
                b.booking_time, 
                b.status,
                c.name AS customer_name,
                fa.name AS agent_name,
                CONCAT(
                    l.street_number, ' ', 
                    l.street_name, ', ', 
                    l.postal_code, ' ', 
                    l.city
                ) AS customer_address
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            LEFT JOIN locations l ON c.location_id = l.id
            WHERE b.bookingId = %s
        """, (booking_id,))
        
        created_booking = cursor.fetchone()
        serialize_booking_timestamps(created_booking)

        return jsonify({
            "success": True,
            "message": "Booking created successfully",
            "data": created_booking
        }), 201

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@booking_bp.route("/bookings/<int:booking_id>", methods=["PUT"])
@require_auth
def update_booking(booking_id):
    """
    Update a booking. Agents can only update their own bookings.
    """
    try:
        data = request.get_json()
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if booking exists and user has access
        if request.role == 'field_agent':
            cursor.execute("""
                SELECT bookingId FROM bookings 
                WHERE bookingId = %s AND agentId = %s
            """, (booking_id, request.user_id))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Booking not found or access denied"}), 404
        else:
            cursor.execute("SELECT bookingId FROM bookings WHERE bookingId = %s", (booking_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Booking not found"}), 404

        # Build dynamic update query
        update_fields = []
        update_values = []

        if data.get("booking_date"):
            update_fields.append("booking_date = %s")
            update_values.append(data["booking_date"])

        if data.get("booking_time"):
            update_fields.append("booking_time = %s")
            update_values.append(data["booking_time"])

        if data.get("status"):
            update_fields.append("status = %s")
            update_values.append(data["status"])

        if data.get("agentId") and request.role != 'field_agent':  # Only dispatchers/admins can reassign
            update_fields.append("agentId = %s")
            update_values.append(data["agentId"])

        if not update_fields:
            return jsonify({"success": False, "error": "No valid fields to update"}), 400

        # Add booking_id for WHERE clause
        update_values.append(booking_id)

        # Execute update
        update_query = f"UPDATE bookings SET {', '.join(update_fields)} WHERE bookingId = %s"
        cursor.execute(update_query, update_values)
        conn.commit()

        # Fetch updated booking with full details
        cursor.execute("""
            SELECT 
                b.bookingId, 
                b.booking_date, 
                b.booking_time, 
                b.status,
                c.name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone,
                fa.name AS agent_name,
                CONCAT(
                    l.street_number, ' ', 
                    l.street_name, ', ', 
                    l.postal_code, ' ', 
                    l.city
                ) AS customer_address
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            LEFT JOIN locations l ON c.location_id = l.id
            WHERE b.bookingId = %s
        """, (booking_id,))
        
        updated_booking = cursor.fetchone()
        serialize_booking_timestamps(updated_booking)

        return jsonify({
            "success": True,
            "message": "Booking updated successfully",
            "data": updated_booking
        }), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@booking_bp.route("/bookings/<int:booking_id>", methods=["DELETE"])
@require_dispatcher  # Only dispatchers can delete bookings
def delete_booking(booking_id):
    """
    Delete a booking (dispatcher access only).
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if booking exists and get details for response
        cursor.execute("""
            SELECT b.bookingId, c.name AS customer_name, b.booking_date, b.booking_time
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            WHERE b.bookingId = %s
        """, (booking_id,))
        
        booking = cursor.fetchone()
        if not booking:
            return jsonify({"success": False, "error": "Booking not found"}), 404

        # Delete the booking (CASCADE will handle related records)
        cursor.execute("DELETE FROM bookings WHERE bookingId = %s", (booking_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Booking for {booking['customer_name']} on {booking['booking_date']} deleted successfully"
        }), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()