from flask import Blueprint, request, jsonify
from db import get_connection
from utils.middleware import require_auth
import bcrypt

dispatcher_bp = Blueprint("dispatcher", __name__, url_prefix="/api")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def serialize_dispatcher_timestamps(dispatcher):
    """Convert dispatcher timestamps to ISO format for JSON serialization"""
    if dispatcher.get('created_time'):
        dispatcher['created_time'] = dispatcher['created_time'].isoformat()
    if dispatcher.get('updated_time'):
        dispatcher['updated_time'] = dispatcher['updated_time'].isoformat()
    return dispatcher

@dispatcher_bp.route("/dispatchers", methods=["GET"])
@require_auth
def get_dispatchers():
    """Get all dispatchers (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT d.dispatcherId, d.name, d.email, d.phone, d.location_id,
                   l.street_number, l.street_name, l.city, l.state_province, l.postal_code, l.country,
                   d.created_time, d.updated_time
            FROM dispatchers d
            LEFT JOIN locations l ON d.location_id = l.id
            ORDER BY d.name
        """)
        dispatchers = cursor.fetchall()

        for dispatcher in dispatchers:
            serialize_dispatcher_timestamps(dispatcher)

        return jsonify({"success": True, "data": dispatchers}), 200

    except Exception as e:
        print(f"[ERROR] Exception in get_dispatchers: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@dispatcher_bp.route("/dispatchers/<int:dispatcher_id>", methods=["GET"])
@require_auth
def get_dispatcher(dispatcher_id):
    """Get a specific dispatcher by ID (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT d.dispatcherId, d.name, d.email, d.phone, d.location_id,
                   l.street_number, l.street_name, l.city, l.state_province, l.postal_code, l.country,
                   d.created_time, d.updated_time
            FROM dispatchers d
            LEFT JOIN locations l ON d.location_id = l.id
            WHERE d.dispatcherId = %s
        """, (dispatcher_id,))
        
        dispatcher = cursor.fetchone()
        if not dispatcher:
            return jsonify({"success": False, "error": "Dispatcher not found"}), 404

        serialize_dispatcher_timestamps(dispatcher)
        return jsonify({"success": True, "data": dispatcher}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@dispatcher_bp.route("/dispatchers", methods=["POST"])
@require_auth
def create_dispatcher():
    """Create a new dispatcher (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        phone = data.get("phone")
        location_id = data.get("location_id")

        # Location fields for creating new location if needed
        street_number = data.get("street_number")
        street_name = data.get("street_name")
        city = data.get("city")
        state_province = data.get("state_province")
        postal_code = data.get("postal_code")
        country = data.get("country", "USA")

        if not name or not email or not password:
            return jsonify({"success": False, "error": "Missing required fields: name, email, password"}), 400

        # Hash the password
        hashed_password = hash_password(password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if email already exists
        cursor.execute("SELECT dispatcherId FROM dispatchers WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"success": False, "error": "Email already exists"}), 409

        # Handle location creation if location data is provided
        if not location_id and street_number and street_name and city and state_province and postal_code:
            # Check if location already exists
            cursor.execute("""
                SELECT id FROM locations 
                WHERE street_number=%s AND street_name=%s AND postal_code=%s 
                  AND city=%s AND state_province=%s
            """, (street_number, street_name, postal_code, city, state_province))
            
            existing_location = cursor.fetchone()
            if existing_location:
                location_id = existing_location['id']
            else:
                # Create new location (using default lat/lng for now)
                cursor.execute("""
                    INSERT INTO locations (latitude, longitude, postal_code, city, state_province, country, street_name, street_number)
                    VALUES (0, 0, %s, %s, %s, %s, %s, %s)
                """, (postal_code, city, state_province, country, street_name, street_number))
                location_id = cursor.lastrowid

        # Insert new dispatcher
        cursor.execute("""
            INSERT INTO dispatchers (name, email, password, phone, location_id)
            VALUES (%s, %s, %s, %s, %s)
        """, (name, email, hashed_password, phone, location_id))

        dispatcher_id = cursor.lastrowid
        conn.commit()

        # Fetch the created dispatcher (excluding password)
        cursor.execute("""
            SELECT d.dispatcherId, d.name, d.email, d.phone, d.location_id,
                   l.street_number, l.street_name, l.city, l.state_province, l.postal_code, l.country,
                   d.created_time, d.updated_time
            FROM dispatchers d
            LEFT JOIN locations l ON d.location_id = l.id
            WHERE d.dispatcherId = %s
        """, (dispatcher_id,))
        dispatcher = cursor.fetchone()

        serialize_dispatcher_timestamps(dispatcher)

        return jsonify({
            "success": True,
            "message": "Dispatcher created successfully",
            "data": dispatcher
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


@dispatcher_bp.route("/dispatchers/<int:dispatcher_id>", methods=["PUT"])
@require_auth
def update_dispatcher(dispatcher_id):
    """Update a dispatcher (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        data = request.get_json()
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if dispatcher exists
        cursor.execute("SELECT dispatcherId FROM dispatchers WHERE dispatcherId = %s", (dispatcher_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Dispatcher not found"}), 404

        # Build dynamic update query
        update_fields = []
        update_values = []

        if data.get("name"):
            update_fields.append("name = %s")
            update_values.append(data["name"])

        if data.get("email"):
            # Check if new email already exists (excluding current dispatcher)
            cursor.execute("SELECT dispatcherId FROM dispatchers WHERE email = %s AND dispatcherId != %s", (data["email"], dispatcher_id))
            if cursor.fetchone():
                return jsonify({"success": False, "error": "Email already exists"}), 409
            
            update_fields.append("email = %s")
            update_values.append(data["email"])

        if data.get("password"):
            hashed_password = hash_password(data["password"])
            update_fields.append("password = %s")
            update_values.append(hashed_password)

        if "phone" in data:  # Allow setting phone to None/null
            update_fields.append("phone = %s")
            update_values.append(data["phone"])

        # Handle location update/creation
        location_id = data.get("location_id")
        street_number = data.get("street_number")
        street_name = data.get("street_name")
        city = data.get("city")
        state_province = data.get("state_province")
        postal_code = data.get("postal_code")
        country = data.get("country", "USA")

        if not location_id and street_number and street_name and city and state_province and postal_code:
            # Check if location already exists
            cursor.execute("""
                SELECT id FROM locations 
                WHERE street_number=%s AND street_name=%s AND postal_code=%s 
                  AND city=%s AND state_province=%s
            """, (street_number, street_name, postal_code, city, state_province))
            
            existing_location = cursor.fetchone()
            if existing_location:
                location_id = existing_location['id']
            else:
                # Create new location (using default lat/lng for now)
                cursor.execute("""
                    INSERT INTO locations (latitude, longitude, postal_code, city, state_province, country, street_name, street_number)
                    VALUES (0, 0, %s, %s, %s, %s, %s, %s)
                """, (postal_code, city, state_province, country, street_name, street_number))
                location_id = cursor.lastrowid

        if "location_id" in data or location_id is not None:  # Allow setting location_id to None/null
            update_fields.append("location_id = %s")
            update_values.append(location_id)

        if not update_fields:
            return jsonify({"success": False, "error": "No valid fields to update"}), 400

        # Add dispatcher_id for WHERE clause
        update_values.append(dispatcher_id)

        # Execute update
        update_query = f"UPDATE dispatchers SET {', '.join(update_fields)} WHERE dispatcherId = %s"
        cursor.execute(update_query, update_values)
        conn.commit()

        # Fetch updated dispatcher (excluding password)
        cursor.execute("""
            SELECT d.dispatcherId, d.name, d.email, d.phone, d.location_id,
                   l.street_number, l.street_name, l.city, l.state_province, l.postal_code, l.country,
                   d.created_time, d.updated_time
            FROM dispatchers d
            LEFT JOIN locations l ON d.location_id = l.id
            WHERE d.dispatcherId = %s
        """, (dispatcher_id,))
        dispatcher = cursor.fetchone()

        serialize_dispatcher_timestamps(dispatcher)

        return jsonify({
            "success": True,
            "message": "Dispatcher updated successfully",
            "data": dispatcher
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


@dispatcher_bp.route("/dispatchers/<int:dispatcher_id>", methods=["DELETE"])
@require_auth
def delete_dispatcher(dispatcher_id):
    """Delete a dispatcher (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if dispatcher exists and get details for response
        cursor.execute("SELECT dispatcherId, name FROM dispatchers WHERE dispatcherId = %s", (dispatcher_id,))
        dispatcher = cursor.fetchone()
        
        if not dispatcher:
            return jsonify({"success": False, "error": "Dispatcher not found"}), 404

        # Delete the dispatcher
        cursor.execute("DELETE FROM dispatchers WHERE dispatcherId = %s", (dispatcher_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Dispatcher '{dispatcher['name']}' deleted successfully"
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