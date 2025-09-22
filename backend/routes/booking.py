from flask import Blueprint, request, jsonify
from db import get_connection
from utils.async_notifier import send_notifications_async, prepare_booking_notifications
from utils.middleware import require_any_role
import datetime
import os

booking_bp = Blueprint("booking", __name__, url_prefix="/api")

# Call Center API Key (should be set in environment variables)
CALL_CENTER_API_KEY = os.getenv('CALL_CENTER_API_KEY', 'cc_api_key_change_this_in_production')

def require_call_center_auth(f):
    """Middleware to authenticate call center API requests"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key') or request.headers.get('X-Api-Key')
        if not api_key:
            return jsonify({"success": False, "error": "API key required"}), 401
        
        if api_key != CALL_CENTER_API_KEY:
            return jsonify({"success": False, "error": "Invalid API key"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

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


@booking_bp.route("/bookings", methods=["GET"])
@require_any_role('admin', 'dispatcher')
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

        # Get filter parameters
        region_filter = request.args.get('region_id')
        user_role = getattr(request, 'role', None)
        user_id = getattr(request, 'user_id', None)
        
        base_query = """
          SELECT b.bookingId, b.booking_date, b.booking_time, b.status,
            c.name AS customer_name,
            fa.name AS agent_name,
            d.dispositionId AS disposition_id,
            d.typeCode AS disposition_code,
            d.note AS disposition_note,
            dt.description AS disposition_description,
            l.latitude AS customer_latitude,
            l.longitude AS customer_longitude,
            CONCAT(
                l.street_number, ' ', 
                l.street_name, ', ', 
                l.postal_code, ' ', 
                l.city
            ) AS customer_address,
            r.regionId, r.name AS region_name, r.is_global AS region_is_global,
            b.call_center_agent_name, b.call_center_agent_email
          FROM bookings b
          JOIN customers c ON b.customerId = c.customerId
          LEFT JOIN field_agents fa ON b.agentId = fa.agentId
          LEFT JOIN dispositions d ON b.dispositionId = d.dispositionId
          LEFT JOIN disposition_types dt ON d.typeCode = dt.typeCode
          LEFT JOIN locations l ON c.location_id = l.id
          LEFT JOIN regions r ON b.region_id = r.regionId
        """
        
        where_conditions = []
        query_params = []
        
        # Apply region filtering for dispatchers
        if user_role == 'dispatcher':
            # Get dispatcher's team region
            cursor.execute("""
                SELECT DISTINCT r.regionId 
                FROM dispatchers d 
                JOIN teams t ON d.team_id = t.teamId 
                JOIN regions r ON t.region_id = r.regionId 
                WHERE d.dispatcherId = %s
            """, (user_id,))
            dispatcher_region = cursor.fetchone()
            
            if dispatcher_region:
                # Dispatcher can see bookings in their team's region OR global bookings
                where_conditions.append("(b.region_id = %s OR r.is_global = TRUE)")
                query_params.append(dispatcher_region['regionId'])
        
        # Apply specific region filter if requested (admin only)
        if region_filter and user_role == 'admin':
            where_conditions.append("b.region_id = %s")
            query_params.append(region_filter)
        
        # Build final query
        if where_conditions:
            query = base_query + " WHERE " + " AND ".join(where_conditions)
        else:
            query = base_query
            
        query += " ORDER BY b.booking_date, b.booking_time"
        cursor.execute(query, query_params)

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
@require_any_role('admin', 'dispatcher', 'field_agent')
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
              l.latitude AS customer_latitude,
              l.longitude AS customer_longitude,
              CONCAT(
                  l.street_number, ' ', 
                  l.street_name, ', ', 
                  l.postal_code, ' ', 
                  l.city
              ) AS customer_address,
              r.regionId, r.name AS region_name, r.is_global AS region_is_global,
              b.call_center_agent_name, b.call_center_agent_email
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
          LEFT JOIN regions r 
              ON b.region_id = r.regionId
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
@require_any_role('admin', 'dispatcher', 'field_agent')
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
                    l.latitude AS customer_latitude,
                    l.longitude AS customer_longitude,
                    CONCAT(
                        l.street_number, ' ', 
                        l.street_name, ', ', 
                        l.postal_code, ' ', 
                        l.city
                    ) AS customer_address,
                    r.regionId, r.name AS region_name, r.is_global AS region_is_global,
                    b.call_center_agent_name, b.call_center_agent_email
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
                LEFT JOIN regions r 
                    ON b.region_id = r.regionId
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
                    l.latitude AS customer_latitude,
                    l.longitude AS customer_longitude,
                    CONCAT(
                        l.street_number, ' ', 
                        l.street_name, ', ', 
                        l.postal_code, ' ', 
                        l.city
                    ) AS customer_address,
                    r.regionId, r.name AS region_name, r.is_global AS region_is_global,
                    b.call_center_agent_name, b.call_center_agent_email
                FROM bookings b
                JOIN customers c ON b.customerId = c.customerId
                LEFT JOIN field_agents fa ON b.agentId = fa.agentId
                LEFT JOIN dispositions d ON b.dispositionId = d.dispositionId
                LEFT JOIN disposition_types dt ON d.typeCode = dt.typeCode
                LEFT JOIN locations l ON c.location_id = l.id
                LEFT JOIN regions r ON b.region_id = r.regionId
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
@require_any_role('admin', 'dispatcher')  # Only admins and dispatchers can create bookings
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

        # Validate and get region_id
        region_id = data["booking"].get("region_id")
        if region_id is not None:
            cursor.execute("SELECT regionId FROM regions WHERE regionId = %s", (region_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Invalid region ID"}), 400
        else:
            # Default to Global region (regionId = 1)
            region_id = 1
        
        # Booking insert
        cursor.execute("""
            INSERT INTO bookings (agentId, customerId, booking_date, booking_time, region_id)
            VALUES (%s,%s,%s,%s,%s)
        """, (
            data["booking"]["agentId"],
            customer_id,
            data["booking"]["booking_date"],
            data["booking"]["booking_time"],
            region_id
        ))
        booking_id = cursor.lastrowid

        # Fetch agent info
        cursor.execute("SELECT name, email, phone FROM field_agents WHERE agentId=%s", (data["booking"]["agentId"],))
        agent = cursor.fetchone()

        conn.commit()

        # -------------------- Notifications -------------------- #
        # Prepare notification data
        notification_data = {
            'customer_name': data['customer']['name'],
            'customer_email': data['customer'].get('email'),
            'customer_phone': data['customer'].get('phone'),
            'agent_name': agent['name'],
            'agent_email': agent.get('email'),
            'agent_phone': agent.get('phone'),
            'booking_date': data['booking']['booking_date'],
            'booking_time': data['booking']['booking_time']
        }
        
        # Send notifications asynchronously
        notifications = prepare_booking_notifications(notification_data, is_update=False)
        send_notifications_async(notifications)

        # Fetch the created booking with full details including region
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
                ) AS customer_address,
                r.regionId, r.name AS region_name, r.is_global AS region_is_global
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN regions r ON b.region_id = r.regionId
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
@require_any_role('admin', 'dispatcher', 'field_agent')
def update_booking(booking_id):
    """
    Update a booking (admin, dispatcher, and field agent access).
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

        if "agentId" in data and request.role != 'field_agent':  # Only dispatchers/admins can reassign
            update_fields.append("agentId = %s")
            update_values.append(data["agentId"])

        if "region_id" in data and request.role == 'admin':  # Only admins can change region
            region_id = data["region_id"]
            if region_id is not None:
                # Validate region exists
                cursor.execute("SELECT regionId FROM regions WHERE regionId = %s", (region_id,))
                if not cursor.fetchone():
                    return jsonify({"success": False, "error": "Invalid region ID"}), 400
            update_fields.append("region_id = %s")
            update_values.append(region_id)

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
                ) AS customer_address,
                r.regionId, r.name AS region_name, r.is_global AS region_is_global,
                b.call_center_agent_name, b.call_center_agent_email
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN regions r ON b.region_id = r.regionId
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
@require_any_role('admin', 'dispatcher')  # Admins and dispatchers can delete bookings
def delete_booking(booking_id):
    """
    Delete a booking (admin and dispatcher access).
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


@booking_bp.route("/call-center/booking", methods=["POST"])
@require_call_center_auth
def create_call_center_booking():
    """
    Create a new booking from call center with call center agent tracking.
    Always creates unassigned bookings (agentId = NULL).
    """
    try:
        data = request.get_json()
        
        # Validate required call center agent info
        if not data.get("call_center_agent"):
            return jsonify({"success": False, "error": "Call center agent information is required"}), 400
        
        call_center_agent = data["call_center_agent"]
        if not call_center_agent.get("name") or not call_center_agent.get("email"):
            return jsonify({"success": False, "error": "Call center agent name and email are required"}), 400
        
        # Validate region selection (REQUIRED)
        region_id = data["booking"].get("region_id")
        if region_id is None:
            return jsonify({"success": False, "error": "Region selection is required for all appointments"}), 400
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if region exists
        cursor.execute("SELECT regionId, is_global, name FROM regions WHERE regionId = %s", (region_id,))
        region = cursor.fetchone()
        if not region:
            return jsonify({"success": False, "error": "Invalid region ID"}), 400
        
        # Prepare warning if Global region is selected
        warning_message = None
        if region['is_global']:
            warning_message = "Warning: Global region selected. This appointment will be visible to all teams, which is not recommended for optimal workflow."

        # Location lookup/insert (same logic as regular booking creation)
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

        # Customer lookup/insert (same logic as regular booking creation)
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

        # Create booking with agentId=NULL (unassigned) and specified region
        cursor.execute("""
            INSERT INTO bookings (agentId, customerId, booking_date, booking_time, status, region_id, call_center_agent_name, call_center_agent_email)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            None,  # Always unassigned from call center
            customer_id,
            data["booking"]["booking_date"],
            data["booking"]["booking_time"],
            "scheduled",  # Default status
            region_id,
            call_center_agent["name"],
            call_center_agent["email"]
        ))
        booking_id = cursor.lastrowid

        conn.commit()

        # Fetch the created booking with full details including region
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
                ) AS customer_address,
                r.regionId, r.name AS region_name, r.is_global AS region_is_global
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            LEFT JOIN field_agents fa ON b.agentId = fa.agentId
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN regions r ON b.region_id = r.regionId
            WHERE b.bookingId = %s
        """, (booking_id,))
        
        created_booking = cursor.fetchone()
        serialize_booking_timestamps(created_booking)

        # Prepare notification data (no agent notifications since unassigned)
        notification_data = {
            'customer_name': data['customer']['name'],
            'customer_email': data['customer'].get('email'),
            'customer_phone': data['customer'].get('phone'),
            'agent_name': None,  # No agent assigned
            'agent_email': None,
            'agent_phone': None,
            'booking_date': data['booking']['booking_date'],
            'booking_time': data['booking']['booking_time']
        }
        
        # Send customer notification only (no agent since unassigned)
        notifications = prepare_booking_notifications(notification_data, is_update=False)
        if notifications:
            send_notifications_async(notifications)

        response_data = {
            "success": True,
            "message": f"Booking created successfully by {call_center_agent['name']} - unassigned, ready for dispatcher assignment",
            "data": created_booking,
            "call_center_agent": call_center_agent['name']
        }
        
        # Include warning if Global region was selected
        if warning_message:
            response_data["warning"] = warning_message
        
        return jsonify(response_data), 201

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()