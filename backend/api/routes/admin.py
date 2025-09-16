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
        password = data.get("password", "Room2025!")

        if not name or not email:
            return jsonify({"success": False, "error": "Missing required fields: name, email"}), 400

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

@admin_bp.route("/users/<int:user_id>/switch-role", methods=["PUT"])
@require_auth
def switch_user_role(user_id):
    """Switch a user's role between admin, dispatcher, and field_agent (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        data = request.get_json()
        current_role = data.get("current_role")
        target_role = data.get("target_role")
        
        if not current_role or not target_role:
            return jsonify({"success": False, "error": "Missing required fields: current_role, target_role"}), 400

        if current_role == target_role:
            return jsonify({"success": False, "error": "Current role and target role cannot be the same"}), 400

        valid_roles = ['admin', 'dispatcher', 'field_agent']
        if current_role not in valid_roles or target_role not in valid_roles:
            return jsonify({"success": False, "error": f"Invalid role. Valid roles: {', '.join(valid_roles)}"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Map roles to their respective tables and ID fields
        role_table_map = {
            'admin': ('admins', 'adminId'),
            'dispatcher': ('dispatchers', 'dispatcherId'), 
            'field_agent': ('field_agents', 'agentId')
        }

        current_table, current_id_field = role_table_map[current_role]
        target_table, target_id_field = role_table_map[target_role]

        # Fetch current user data
        cursor.execute(f"""
            SELECT * FROM {current_table} 
            WHERE {current_id_field} = %s
        """, (user_id,))
        
        current_user = cursor.fetchone()
        if not current_user:
            return jsonify({"success": False, "error": f"User not found in {current_role} table"}), 404

        # Check if email already exists in target table
        cursor.execute(f"SELECT email FROM {target_table} WHERE email = %s", (current_user['email'],))
        if cursor.fetchone():
            return jsonify({"success": False, "error": f"Email already exists in {target_role} table"}), 409

        # Insert user into target table with appropriate fields
        if target_role == 'admin':
            cursor.execute("""
                INSERT INTO admins (name, email, password)
                VALUES (%s, %s, %s)
            """, (current_user['name'], current_user['email'], current_user['password']))
            
        elif target_role == 'dispatcher':
            cursor.execute("""
                INSERT INTO dispatchers (name, email, password, phone, location_id, team_id)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (current_user['name'], current_user['email'], current_user['password'], 
                  current_user.get('phone'), current_user.get('location_id'), current_user.get('team_id')))
                  
        elif target_role == 'field_agent':
            cursor.execute("""
                INSERT INTO field_agents (name, email, password, phone, status, location_id, team_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (current_user['name'], current_user['email'], current_user['password'], 
                  current_user.get('phone'), current_user.get('status', 'available'), 
                  current_user.get('location_id'), current_user.get('team_id')))

        new_user_id = cursor.lastrowid

        # Delete user from current table
        cursor.execute(f"DELETE FROM {current_table} WHERE {current_id_field} = %s", (user_id,))

        conn.commit()

        # Fetch the newly created user
        cursor.execute(f"""
            SELECT {target_id_field} as id, name, email, created_time, updated_time
            FROM {target_table}
            WHERE {target_id_field} = %s
        """, (new_user_id,))
        
        new_user = cursor.fetchone()

        # Convert timestamps to strings for JSON serialization
        if new_user['created_time']:
            new_user['created_time'] = new_user['created_time'].isoformat()
        if new_user['updated_time']:
            new_user['updated_time'] = new_user['updated_time'].isoformat()

        return jsonify({
            "success": True,
            "message": f"User role switched from {current_role} to {target_role} successfully",
            "data": {
                "new_user_id": new_user_id,
                "new_role": target_role,
                "user": new_user
            }
        }), 200

    except Exception as e:
        if 'conn' in locals(): 
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_bp.route("/users/all-roles", methods=["GET"])
@require_auth
def get_all_users_with_roles():
    """Get all users from all tables with their roles (admin access only)"""
    try:
        if request.role != 'admin':
            return jsonify({"success": False, "error": "Admin access required"}), 403

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        all_users = []

        # Fetch admins
        cursor.execute("""
            SELECT adminId as id, name, email, created_time, updated_time, 'admin' as role
            FROM admins
            ORDER BY name
        """)
        admins = cursor.fetchall()
        
        # Fetch dispatchers
        cursor.execute("""
            SELECT d.dispatcherId as id, d.name, d.email, d.phone, d.location_id,
                   l.street_number, l.street_name, l.city, l.state_province, l.postal_code, l.country,
                   d.created_time, d.updated_time, 'dispatcher' as role
            FROM dispatchers d
            LEFT JOIN locations l ON d.location_id = l.id
            ORDER BY d.name
        """)
        dispatchers = cursor.fetchall()

        # Fetch field agents  
        cursor.execute("""
            SELECT agentId as id, name, email, phone, status, location_id, 
                   created_time, updated_time, 'field_agent' as role
            FROM field_agents
            ORDER BY name
        """)
        agents = cursor.fetchall()

        # Combine all users and serialize timestamps
        all_users = admins + dispatchers + agents
        for user in all_users:
            if user.get('created_time'):
                user['created_time'] = user['created_time'].isoformat()
            if user.get('updated_time'):
                user['updated_time'] = user['updated_time'].isoformat()

        return jsonify({"success": True, "data": all_users}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()