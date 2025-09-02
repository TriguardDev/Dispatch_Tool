from flask import Blueprint, request, jsonify
from db import get_connection

search_bp = Blueprint("search", __name__, url_prefix="/api")

@search_bp.route("/search", methods=["GET"])
def search_agents():
    """
    Find nearest available agents by coordinates and time slot.
    """
    try:
        lat = request.args.get("latitude")
        lon = request.args.get("longitude")
        booking_date = request.args.get("booking_date")
        booking_time = request.args.get("booking_time")
        booking_period = "02:00:00"

        if not (lat and lon and booking_date and booking_time):
            return jsonify({"success": False, "error": "Missing parameters"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT fa.name, fa.agentId,
                (6371 * ACOS(
                    COS(RADIANS(%s)) * COS(RADIANS(l.latitude)) *
                    COS(RADIANS(l.longitude) - RADIANS(%s)) +
                    SIN(RADIANS(%s)) * SIN(RADIANS(l.latitude))
                )) AS distance
            FROM field_agents fa
            INNER JOIN locations l ON fa.location_id = l.id
            WHERE fa.agentId NOT IN (
                SELECT b.agentId
                FROM bookings b
                WHERE b.booking_date = %s
                  AND b.booking_time BETWEEN SUBTIME(%s, %s) AND ADDTIME(%s, %s)
            )
            ORDER BY distance ASC;
        """
        cursor.execute(query, (lat, lon, lat, booking_date, booking_time, booking_period, booking_time, booking_period))
        agents = cursor.fetchall()

        return jsonify(agents), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
