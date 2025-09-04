from flask import Blueprint, request, jsonify
from db import get_connection
from utils.notifier import send_sms, send_email
from utils.middleware import require_auth, require_dispatcher
import datetime

booking_bp = Blueprint("booking", __name__, url_prefix="/api")

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
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@booking_bp.route("/booking", methods=["GET"])
@require_auth
def get_bookings():
    """
    Get all bookings or bookings for a specific agent.
    """
    try:
        agentId = request.args.get("agentId")
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # If user is an agent, they can only see their own bookings
        if request.role == 'field_agent':
            agentId = request.user_id

        if agentId:
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
            WHERE b.agentId = %s
            ORDER BY b.booking_date, b.booking_time;
          """
          cursor.execute(query, (agentId,))
        else:
          # Only dispatchers can see all bookings
          if request.role != 'dispatcher':
              return jsonify({"success": False, "error": "Access denied"}), 403
              
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