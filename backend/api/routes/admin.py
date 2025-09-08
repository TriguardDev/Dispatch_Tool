from flask import Blueprint, request, jsonify
from db import get_connection
from utils.middleware import require_auth
import bcrypt

admin_bp = Blueprint("admin", __name__, url_prefix="/api")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@admin_bp.route("/admins", methods=["GET"])
@require_auth
def get_admins():
    """Get all admins (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT adminId, name, email, created_time, updated_time
            FROM admins
            ORDER BY name
        """)
        admins = cursor.fetchall()

        # Convert timestamps to strings for JSON serialization
        for admin in admins:
            if admin['created_time']:
                admin['created_time'] = admin['created_time'].isoformat()
            if admin['updated_time']:
                admin['updated_time'] = admin['updated_time'].isoformat()

        return jsonify({"success": True, "data": admins}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_bp.route("/admins/<int:admin_id>", methods=["GET"])
@require_auth
def get_admin(admin_id):
    """Get a specific admin by ID (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT adminId, name, email, created_time, updated_time
            FROM admins
            WHERE adminId = %s
        """, (admin_id,))
        admin = cursor.fetchone()

        if not admin:
            return jsonify({"success": False, "error": "Admin not found"}), 404

        # Convert timestamps to strings for JSON serialization
        if admin['created_time']:
            admin['created_time'] = admin['created_time'].isoformat()
        if admin['updated_time']:
            admin['updated_time'] = admin['updated_time'].isoformat()

        return jsonify({"success": True, "data": admin}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_bp.route("/admins", methods=["POST"])
@require_auth
def create_admin():
    """Create a new admin (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email or not password:
            return jsonify({"success": False, "error": "Missing required fields: name, email, password"}), 400

        # Hash the password
        hashed_password = hash_password(password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if email already exists
        cursor.execute("SELECT adminId FROM admins WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"success": False, "error": "Email already exists"}), 409

        # Insert new admin
        cursor.execute("""
            INSERT INTO admins (name, email, password)
            VALUES (%s, %s, %s)
        """, (name, email, hashed_password))

        admin_id = cursor.lastrowid
        conn.commit()

        # Fetch the created admin (excluding password)
        cursor.execute("""
            SELECT adminId, name, email, created_time, updated_time
            FROM admins
            WHERE adminId = %s
        """, (admin_id,))
        admin = cursor.fetchone()

        # Convert timestamps to strings for JSON serialization
        if admin['created_time']:
            admin['created_time'] = admin['created_time'].isoformat()
        if admin['updated_time']:
            admin['updated_time'] = admin['updated_time'].isoformat()

        return jsonify({
            "success": True, 
            "message": "Admin created successfully",
            "data": admin
        }), 201

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_bp.route("/admins/<int:admin_id>", methods=["PUT"])
@require_auth
def update_admin(admin_id):
    """Update an admin (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name and not email and not password:
            return jsonify({"success": False, "error": "At least one field (name, email, password) is required"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if admin exists
        cursor.execute("SELECT adminId FROM admins WHERE adminId = %s", (admin_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Admin not found"}), 404

        # Build dynamic update query
        update_fields = []
        update_values = []

        if name:
            update_fields.append("name = %s")
            update_values.append(name)

        if email:
            # Check if new email already exists (excluding current admin)
            cursor.execute("SELECT adminId FROM admins WHERE email = %s AND adminId != %s", (email, admin_id))
            if cursor.fetchone():
                return jsonify({"success": False, "error": "Email already exists"}), 409
            
            update_fields.append("email = %s")
            update_values.append(email)

        if password:
            hashed_password = hash_password(password)
            update_fields.append("password = %s")
            update_values.append(hashed_password)

        # Add admin_id for WHERE clause
        update_values.append(admin_id)

        # Execute update
        update_query = f"UPDATE admins SET {', '.join(update_fields)} WHERE adminId = %s"
        cursor.execute(update_query, update_values)
        conn.commit()

        # Fetch the updated admin (excluding password)
        cursor.execute("""
            SELECT adminId, name, email, created_time, updated_time
            FROM admins
            WHERE adminId = %s
        """, (admin_id,))
        admin = cursor.fetchone()

        # Convert timestamps to strings for JSON serialization
        if admin['created_time']:
            admin['created_time'] = admin['created_time'].isoformat()
        if admin['updated_time']:
            admin['updated_time'] = admin['updated_time'].isoformat()

        return jsonify({
            "success": True,
            "message": "Admin updated successfully",
            "data": admin
        }), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_bp.route("/admins/<int:admin_id>", methods=["DELETE"])
@require_auth
def delete_admin(admin_id):
    """Delete an admin (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if admin exists
        cursor.execute("SELECT adminId, name FROM admins WHERE adminId = %s", (admin_id,))
        admin = cursor.fetchone()
        
        if not admin:
            return jsonify({"success": False, "error": "Admin not found"}), 404

        # Prevent self-deletion (optional safety check)
        if request.user_id == admin_id:
            return jsonify({"success": False, "error": "Cannot delete your own account"}), 400

        # Delete the admin
        cursor.execute("DELETE FROM admins WHERE adminId = %s", (admin_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Admin '{admin['name']}' deleted successfully"
        }), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()