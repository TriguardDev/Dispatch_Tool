from flask import Blueprint, request, jsonify
from db import get_connection
from utils.middleware import require_auth, require_dispatcher
import bcrypt

agent_bp = Blueprint("agent", __name__, url_prefix="/api")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def serialize_agent_timestamps(agent):
    """Convert agent timestamps to ISO format for JSON serialization"""
    if agent.get('created_time'):
        agent['created_time'] = agent['created_time'].isoformat()
    if agent.get('updated_time'):
        agent['updated_time'] = agent['updated_time'].isoformat()
    return agent

@agent_bp.route("/agents", methods=["GET"])
@require_auth
def get_agents():
    """Get all agents (dispatcher/admin access) or current agent info"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if request.role == 'field_agent':
            # Agents can only see their own info
            cursor.execute("""
                SELECT agentId, name, email, phone, status, created_time, updated_time
                FROM field_agents
                WHERE agentId = %s
            """, (request.user_id,))
            agent = cursor.fetchone()
            if not agent:
                return jsonify({"success": False, "error": "Agent not found"}), 404
            
            serialize_agent_timestamps(agent)
            return jsonify({"success": True, "data": [agent]}), 200
        else:
            # Dispatchers and admins can see all agents
            cursor.execute("""
                SELECT agentId, name, email, phone, status, location_id, created_time, updated_time
                FROM field_agents
                ORDER BY name
            """)
            agents = cursor.fetchall()

            for agent in agents:
                serialize_agent_timestamps(agent)

            return jsonify({"success": True, "data": agents}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@agent_bp.route("/agents/<int:agent_id>", methods=["GET"])
@require_auth
def get_agent(agent_id):
    """Get a specific agent by ID"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Agents can only see their own info
        if request.role == 'field_agent' and request.user_id != agent_id:
            return jsonify({"success": False, "error": "Access denied"}), 403

        cursor.execute("""
            SELECT agentId, name, email, phone, status, location_id, created_time, updated_time
            FROM field_agents
            WHERE agentId = %s
        """, (agent_id,))
        
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "error": "Agent not found"}), 404

        serialize_agent_timestamps(agent)
        return jsonify({"success": True, "data": agent}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@agent_bp.route("/agents", methods=["POST"])
@require_dispatcher  # Only dispatchers can create agents
def create_agent():
    """Create a new field agent"""
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        phone = data.get("phone")
        status = data.get("status", "available")
        location_id = data.get("location_id")

        if not name or not email or not password:
            return jsonify({"success": False, "error": "Missing required fields: name, email, password"}), 400

        # Hash the password
        hashed_password = hash_password(password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if email already exists
        cursor.execute("SELECT agentId FROM field_agents WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"success": False, "error": "Email already exists"}), 409

        # Insert new agent
        cursor.execute("""
            INSERT INTO field_agents (name, email, password, phone, status, location_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (name, email, hashed_password, phone, status, location_id))

        agent_id = cursor.lastrowid
        conn.commit()

        # Fetch the created agent (excluding password)
        cursor.execute("""
            SELECT agentId, name, email, phone, status, location_id, created_time, updated_time
            FROM field_agents
            WHERE agentId = %s
        """, (agent_id,))
        agent = cursor.fetchone()

        serialize_agent_timestamps(agent)

        return jsonify({
            "success": True,
            "message": "Agent created successfully",
            "data": agent
        }), 201

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@agent_bp.route("/agents/<int:agent_id>", methods=["PUT"])
@require_auth
def update_agent(agent_id):
    """Update an agent. Agents can update their own info, dispatchers can update any agent"""
    try:
        data = request.get_json()
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Agents can only update their own info
        if request.role == 'field_agent' and request.user_id != agent_id:
            return jsonify({"success": False, "error": "Access denied"}), 403

        # Check if agent exists
        cursor.execute("SELECT agentId FROM field_agents WHERE agentId = %s", (agent_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Agent not found"}), 404

        # Build dynamic update query
        update_fields = []
        update_values = []

        if data.get("name"):
            update_fields.append("name = %s")
            update_values.append(data["name"])

        if data.get("email"):
            # Check if new email already exists (excluding current agent)
            cursor.execute("SELECT agentId FROM field_agents WHERE email = %s AND agentId != %s", (data["email"], agent_id))
            if cursor.fetchone():
                return jsonify({"success": False, "error": "Email already exists"}), 409
            
            update_fields.append("email = %s")
            update_values.append(data["email"])

        if data.get("phone"):
            update_fields.append("phone = %s")
            update_values.append(data["phone"])

        if data.get("status"):
            update_fields.append("status = %s")
            update_values.append(data["status"])

        if data.get("password"):
            hashed_password = hash_password(data["password"])
            update_fields.append("password = %s")
            update_values.append(hashed_password)

        # Only dispatchers/admins can update location
        if data.get("location_id") is not None and request.role != 'field_agent':
            update_fields.append("location_id = %s")
            update_values.append(data["location_id"])

        if not update_fields:
            return jsonify({"success": False, "error": "No valid fields to update"}), 400

        # Add agent_id for WHERE clause
        update_values.append(agent_id)

        # Execute update
        update_query = f"UPDATE field_agents SET {', '.join(update_fields)} WHERE agentId = %s"
        cursor.execute(update_query, update_values)
        conn.commit()

        # Fetch updated agent (excluding password)
        cursor.execute("""
            SELECT agentId, name, email, phone, status, location_id, created_time, updated_time
            FROM field_agents
            WHERE agentId = %s
        """, (agent_id,))
        agent = cursor.fetchone()

        serialize_agent_timestamps(agent)

        return jsonify({
            "success": True,
            "message": "Agent updated successfully",
            "data": agent
        }), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


@agent_bp.route("/agents/<int:agent_id>", methods=["DELETE"])
@require_dispatcher  # Only dispatchers can delete agents
def delete_agent(agent_id):
    """Delete an agent (dispatcher access only)"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if agent exists and get details for response
        cursor.execute("SELECT agentId, name FROM field_agents WHERE agentId = %s", (agent_id,))
        agent = cursor.fetchone()
        
        if not agent:
            return jsonify({"success": False, "error": "Agent not found"}), 404

        # Check if agent has active bookings
        cursor.execute("""
            SELECT COUNT(*) as booking_count 
            FROM bookings 
            WHERE agentId = %s AND status IN ('scheduled', 'in-progress')
        """, (agent_id,))
        result = cursor.fetchone()
        
        if result['booking_count'] > 0:
            return jsonify({
                "success": False, 
                "error": "Cannot delete agent with active bookings. Please reassign or complete bookings first."
            }), 400

        # Delete the agent (SET NULL will handle bookings reference)
        cursor.execute("DELETE FROM field_agents WHERE agentId = %s", (agent_id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Agent '{agent['name']}' deleted successfully"
        }), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


# Legacy route for backward compatibility
@agent_bp.route("/agent", methods=["PUT"])
@require_auth
def update_agent_status():
    """
    Update an agent's status and fetch customer details
    for the associated booking.
    """
    try:
        data = request.get_json()
        agent_id = data.get("agentId")
        booking_id = data.get("booking_id")
        new_status = data.get("status")

        if not agent_id or not booking_id or not new_status:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Update agent status
        cursor.execute("""
            UPDATE field_agents
            SET status = %s
            WHERE agentId = %s
        """, (new_status, agent_id))

        # Fetch customer details
        cursor.execute("""
            SELECT c.email, c.phone
            FROM bookings b
            JOIN customers c ON b.customerId = c.customerId
            WHERE b.bookingId = %s
        """, (booking_id,))
        res = cursor.fetchone()

        conn.commit()
        return jsonify({
            "success": True,
            "agent_status": new_status,
            "customer_email": res["email"] if res else None
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
