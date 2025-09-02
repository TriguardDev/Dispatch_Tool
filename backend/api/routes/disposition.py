from flask import Blueprint, request, jsonify
from db import get_connection

disposition_bp = Blueprint("disposition", __name__)

@disposition_bp.route("/disposition", methods=["POST"])
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
