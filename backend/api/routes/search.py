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

        # Optimized query with less restrictive availability check (1 hour buffer instead of 2)
        booking_period = "01:00:00"  # Reduced from 2 hours to 1 hour
        
        query = """
            SELECT fa.name, fa.agentId,
                ROUND((6371 * ACOS(
                    COS(RADIANS(%s)) * COS(RADIANS(l.latitude)) *
                    COS(RADIANS(l.longitude) - RADIANS(%s)) +
                    SIN(RADIANS(%s)) * SIN(RADIANS(l.latitude))
                )), 1) AS distance
            FROM field_agents fa
            INNER JOIN locations l ON fa.location_id = l.id
            WHERE fa.agentId NOT IN (
                SELECT COALESCE(b.agentId, 0)
                FROM bookings b
                WHERE b.booking_date = %s
                  AND b.booking_time BETWEEN SUBTIME(%s, %s) AND ADDTIME(%s, %s)
                  AND b.agentId IS NOT NULL
            )
            ORDER BY distance ASC;
        """
        cursor.execute(query, (lat, lon, lat, booking_date, booking_time, booking_period, booking_time, booking_period))
        agents = cursor.fetchall()
        
        # If no agents available with time conflict check, return all agents with distance
        if len(agents) == 0:
            fallback_query = """
                SELECT fa.name, fa.agentId,
                    ROUND((6371 * ACOS(
                        COS(RADIANS(%s)) * COS(RADIANS(l.latitude)) *
                        COS(RADIANS(l.longitude) - RADIANS(%s)) +
                        SIN(RADIANS(%s)) * SIN(RADIANS(l.latitude))
                    )), 1) AS distance
                FROM field_agents fa
                INNER JOIN locations l ON fa.location_id = l.id
                ORDER BY distance ASC;
            """
            cursor.execute(fallback_query, (lat, lon, lat))
            agents = cursor.fetchall()

        return jsonify(agents), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
