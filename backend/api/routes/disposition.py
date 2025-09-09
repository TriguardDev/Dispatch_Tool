from flask import Blueprint, request, jsonify
from db import get_connection
from utils.middleware import require_auth, require_dispatcher

disposition_bp = Blueprint("disposition", __name__, url_prefix="/api")

def serialize_disposition_timestamps(disposition):
    """Convert disposition timestamps to ISO format for JSON serialization"""
    if disposition.get('created_time'):
        disposition['created_time'] = disposition['created_time'].isoformat()
    if disposition.get('updated_time'):
        disposition['updated_time'] = disposition['updated_time'].isoformat()
    return disposition

@disposition_bp.route("/disposition-types", methods=["GET"])
@require_auth
def get_disposition_types():
    """Get all available disposition types"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT typeCode, description, created_time, updated_time
            FROM disposition_types
            ORDER BY description
        """)
        types = cursor.fetchall()

        for type_item in types:
            serialize_disposition_timestamps(type_item)

        return jsonify({"success": True, "data": types}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@disposition_bp.route("/dispositions", methods=["GET"])
@require_auth
def get_dispositions():
    """Get all dispositions with optional filtering"""
    try:
        booking_id = request.args.get("bookingId")
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if booking_id:
            # Get disposition for specific booking
            cursor.execute("""
                SELECT 
                    d.dispositionId,
                    d.typeCode,
                    d.note,
                    d.created_time,
                    d.updated_time,
                    dt.description,
                    b.bookingId,
                    c.name as customer_name
                FROM dispositions d
                JOIN disposition_types dt ON d.typeCode = dt.typeCode
                LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
                LEFT JOIN customers c ON b.customerId = c.customerId
                WHERE b.bookingId = %s
            """, (booking_id,))
        else:
            # Get all dispositions
            if request.role == 'field_agent':
                # Agents can only see dispositions for their bookings
                cursor.execute("""
                    SELECT 
                        d.dispositionId,
                        d.typeCode,
                        d.note,
                        d.created_time,
                        d.updated_time,
                        dt.description,
                        b.bookingId,
                        c.name as customer_name
                    FROM dispositions d
                    JOIN disposition_types dt ON d.typeCode = dt.typeCode
                    LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
                    LEFT JOIN customers c ON b.customerId = c.customerId
                    WHERE b.agentId = %s
                    ORDER BY d.created_time DESC
                """, (request.user_id,))
            else:
                # Dispatchers and admins can see all dispositions
                cursor.execute("""
                    SELECT 
                        d.dispositionId,
                        d.typeCode,
                        d.note,
                        d.created_time,
                        d.updated_time,
                        dt.description,
                        b.bookingId,
                        c.name as customer_name
                    FROM dispositions d
                    JOIN disposition_types dt ON d.typeCode = dt.typeCode
                    LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
                    LEFT JOIN customers c ON b.customerId = c.customerId
                    ORDER BY d.created_time DESC
                """)

        dispositions = cursor.fetchall()

        for disposition in dispositions:
            serialize_disposition_timestamps(disposition)

        return jsonify({"success": True, "data": dispositions}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@disposition_bp.route("/dispositions/<int:disposition_id>", methods=["GET"])
@require_auth
def get_disposition(disposition_id):
    """Get a specific disposition by ID"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if request.role == 'field_agent':
            # Agents can only see dispositions for their bookings
            cursor.execute("""
                SELECT 
                    d.dispositionId,
                    d.typeCode,
                    d.note,
                    d.created_time,
                    d.updated_time,
                    dt.description,
                    b.bookingId,
                    c.name as customer_name
                FROM dispositions d
                JOIN disposition_types dt ON d.typeCode = dt.typeCode
                LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
                LEFT JOIN customers c ON b.customerId = c.customerId
                WHERE d.dispositionId = %s AND b.agentId = %s
            """, (disposition_id, request.user_id))
        else:
            cursor.execute("""
                SELECT 
                    d.dispositionId,
                    d.typeCode,
                    d.note,
                    d.created_time,
                    d.updated_time,
                    dt.description,
                    b.bookingId,
                    c.name as customer_name
                FROM dispositions d
                JOIN disposition_types dt ON d.typeCode = dt.typeCode
                LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
                LEFT JOIN customers c ON b.customerId = c.customerId
                WHERE d.dispositionId = %s
            """, (disposition_id,))

        disposition = cursor.fetchone()
        if not disposition:
            return jsonify({"success": False, "error": "Disposition not found"}), 404

        serialize_disposition_timestamps(disposition)
        return jsonify({"success": True, "data": disposition}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@disposition_bp.route("/dispositions", methods=["POST"])
@require_auth
def create_disposition():
    """Create a new disposition for a booking"""
    try:
        data = request.get_json()
        booking_id = data.get("bookingId")
        disposition_type = data.get("dispositionType")
        note = data.get("note")

        if not booking_id or not disposition_type:
            return jsonify({"success": False, "error": "Missing required fields: bookingId, dispositionType"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Verify booking exists and user has access
        if request.role == 'field_agent':
            cursor.execute("""
                SELECT bookingId, dispositionId FROM bookings 
                WHERE bookingId = %s AND agentId = %s
            """, (booking_id, request.user_id))
        else:
            cursor.execute("SELECT bookingId, dispositionId FROM bookings WHERE bookingId = %s", (booking_id,))
        
        booking = cursor.fetchone()
        if not booking:
            return jsonify({"success": False, "error": "Booking not found or access denied"}), 404

        if booking['dispositionId']:
            return jsonify({"success": False, "error": "Booking already has a disposition. Use PUT to update."}), 409

        # Verify disposition type exists
        cursor.execute("SELECT typeCode FROM disposition_types WHERE typeCode = %s", (disposition_type,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Invalid disposition type"}), 400

        # Create disposition
        cursor.execute("""
            INSERT INTO dispositions (typeCode, note)
            VALUES (%s, %s)
        """, (disposition_type, note))
        disposition_id = cursor.lastrowid

        # Link disposition to booking
        cursor.execute("""
            UPDATE bookings SET dispositionId = %s WHERE bookingId = %s
        """, (disposition_id, booking_id))

        conn.commit()

        # Fetch the created disposition with full details
        cursor.execute("""
            SELECT 
                d.dispositionId,
                d.typeCode,
                d.note,
                d.created_time,
                d.updated_time,
                dt.description,
                b.bookingId,
                c.name as customer_name
            FROM dispositions d
            JOIN disposition_types dt ON d.typeCode = dt.typeCode
            LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
            LEFT JOIN customers c ON b.customerId = c.customerId
            WHERE d.dispositionId = %s
        """, (disposition_id,))
        
        created_disposition = cursor.fetchone()
        serialize_disposition_timestamps(created_disposition)

        return jsonify({
            "success": True,
            "message": "Disposition created successfully",
            "data": created_disposition
        }), 201

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@disposition_bp.route("/dispositions/<int:disposition_id>", methods=["PUT"])
@require_auth
def update_disposition(disposition_id):
    """Update a disposition"""
    try:
        data = request.get_json()
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if disposition exists and user has access
        if request.role == 'field_agent':
            cursor.execute("""
                SELECT d.dispositionId FROM dispositions d
                LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
                WHERE d.dispositionId = %s AND b.agentId = %s
            """, (disposition_id, request.user_id))
        else:
            cursor.execute("SELECT dispositionId FROM dispositions WHERE dispositionId = %s", (disposition_id,))
        
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Disposition not found or access denied"}), 404

        # Build dynamic update query
        update_fields = []
        update_values = []

        if data.get("dispositionType"):
            # Verify new disposition type exists
            cursor.execute("SELECT typeCode FROM disposition_types WHERE typeCode = %s", (data["dispositionType"],))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Invalid disposition type"}), 400
            
            update_fields.append("typeCode = %s")
            update_values.append(data["dispositionType"])

        if data.get("note") is not None:  # Allow empty string
            update_fields.append("note = %s")
            update_values.append(data["note"])

        if not update_fields:
            return jsonify({"success": False, "error": "No valid fields to update"}), 400

        # Add disposition_id for WHERE clause
        update_values.append(disposition_id)

        # Execute update
        update_query = f"UPDATE dispositions SET {', '.join(update_fields)} WHERE dispositionId = %s"
        cursor.execute(update_query, update_values)
        conn.commit()

        # Fetch updated disposition with full details
        cursor.execute("""
            SELECT 
                d.dispositionId,
                d.typeCode,
                d.note,
                d.created_time,
                d.updated_time,
                dt.description,
                b.bookingId,
                c.name as customer_name
            FROM dispositions d
            JOIN disposition_types dt ON d.typeCode = dt.typeCode
            LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
            LEFT JOIN customers c ON b.customerId = c.customerId
            WHERE d.dispositionId = %s
        """, (disposition_id,))
        
        updated_disposition = cursor.fetchone()
        serialize_disposition_timestamps(updated_disposition)

        return jsonify({
            "success": True,
            "message": "Disposition updated successfully",
            "data": updated_disposition
        }), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@disposition_bp.route("/dispositions/<int:disposition_id>", methods=["DELETE"])
@require_dispatcher  # Only dispatchers can delete dispositions
def delete_disposition(disposition_id):
    """Delete a disposition (dispatcher access only)"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if disposition exists and get details for response
        cursor.execute("""
            SELECT 
                d.dispositionId,
                dt.description,
                b.bookingId,
                c.name as customer_name
            FROM dispositions d
            JOIN disposition_types dt ON d.typeCode = dt.typeCode
            LEFT JOIN bookings b ON b.dispositionId = d.dispositionId
            LEFT JOIN customers c ON b.customerId = c.customerId
            WHERE d.dispositionId = %s
        """, (disposition_id,))
        
        disposition = cursor.fetchone()
        if not disposition:
            return jsonify({"success": False, "error": "Disposition not found"}), 404

        # Remove disposition link from booking first
        if disposition['bookingId']:
            cursor.execute("UPDATE bookings SET dispositionId = NULL WHERE dispositionId = %s", (disposition_id,))

        # Delete the disposition
        cursor.execute("DELETE FROM dispositions WHERE dispositionId = %s", (disposition_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Disposition '{disposition['description']}' deleted successfully"
        }), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


# Legacy route for backward compatibility  
@disposition_bp.route("/disposition", methods=["POST"])
@require_auth
def add_disposition():
    """
    Add or update disposition for a booking.
    """
    try:
        data = request.get_json()
        booking_id = data.get("bookingId")
        disposition_type = data.get("dispositionType")
        note = data.get("note")

        if not booking_id or not disposition_type:
            return jsonify({"success": False, "error": "Missing fields"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT dispositionId FROM bookings WHERE bookingId = %s", (booking_id,))
        booking = cursor.fetchone()

        if not booking:
            return jsonify({"success": False, "error": "Booking not found"}), 404

        disposition_id = booking.get("dispositionId")

        if disposition_id:
            cursor.execute("""
                UPDATE dispositions
                SET typeCode=%s, note=%s
                WHERE dispositionId=%s
            """, (disposition_type, note, disposition_id))
        else:
            cursor.execute("""
                INSERT INTO dispositions (typeCode, note)
                VALUES (%s,%s)
            """, (disposition_type, note))
            new_id = cursor.lastrowid
            cursor.execute("""
                UPDATE bookings SET dispositionId=%s WHERE bookingId=%s
            """, (new_id, booking_id))

        # TODO: Send notification to dispatcher (and customer and agent?)
        conn.commit()
        return jsonify({"success": True, "message": "Disposition saved"}), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
