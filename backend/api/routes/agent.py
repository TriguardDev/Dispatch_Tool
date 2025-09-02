from flask import Blueprint, request, jsonify
from db import get_connection

agent_bp = Blueprint("agent", __name__, url_prefix="/api")

@agent_bp.route("/agent", methods=["PUT"])
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
