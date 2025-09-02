from flask import Blueprint, request, jsonify
from db import get_connection
import uuid

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a dispatcher or agent using email/password.
    """
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"success": False, "error": "Missing email or password"}), 400

        conn = get_connection()
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
            return jsonify({
                "success": True,
                "id": result["id"],
                "user_type": result["user_type"],
                "token": str(uuid.uuid4())
            }), 200
        else:
            return jsonify({"success": False, "error": "Email or password incorrect"}), 404

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
