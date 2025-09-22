from flask import Blueprint, request, jsonify
from db import get_connection

search_bp = Blueprint("search", __name__, url_prefix="/api")

@search_bp.route("/search", methods=["GET"])
def search_agents():
    """
    Find nearest available agents by coordinates and time slot.
    Now includes timesheet availability checking.
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

        # Optimized query with time-off and timesheet checking
        booking_period = "01:00:00"  # Reduced from 2 hours to 1 hour
        
        # Parse booking date to get day of week and week start date
        from datetime import datetime, timedelta
        booking_datetime = datetime.strptime(booking_date, '%Y-%m-%d')
        day_of_week = booking_datetime.strftime('%A').lower()
        
        # Get Monday of the week containing the booking date
        days_since_monday = booking_datetime.weekday()
        week_start_date = booking_datetime - timedelta(days=days_since_monday)
        week_start_date_str = week_start_date.strftime('%Y-%m-%d')
        
        query = """
            SELECT fa.name, fa.agentId,
                ROUND((6371 * ACOS(
                    COS(RADIANS(%s)) * COS(RADIANS(l.latitude)) *
                    COS(RADIANS(l.longitude) - RADIANS(%s)) +
                    SIN(RADIANS(%s)) * SIN(RADIANS(l.latitude))
                )), 1) AS distance,
                CASE 
                    WHEN tor.requestId IS NOT NULL THEN 'unavailable (time-off)'
                    WHEN ts.timesheet_id IS NULL THEN 'unavailable (no timesheet)'
                    WHEN ts.status != 'approved' THEN 'unavailable (timesheet not approved)'
                    WHEN tss.slot_id IS NULL THEN 'unavailable (not scheduled)'
                    ELSE 'available'
                END as availability_status,
                CASE 
                    WHEN tor.requestId IS NOT NULL THEN CONCAT(
                        'Time-off: ',
                        IF(tor.is_full_day, 'Full day', CONCAT(tor.start_time, ' - ', tor.end_time))
                    )
                    WHEN ts.timesheet_id IS NULL THEN 'No timesheet submitted'
                    WHEN ts.status != 'approved' THEN CONCAT('Timesheet status: ', ts.status)
                    WHEN tss.slot_id IS NULL THEN 'Not scheduled for this time'
                    ELSE NULL
                END as unavailable_reason
            FROM field_agents fa
            INNER JOIN locations l ON fa.location_id = l.id
            LEFT JOIN time_off_requests tor ON fa.agentId = tor.agentId 
                AND tor.status = 'approved'
                AND tor.request_date = %s
                AND (
                    tor.is_full_day = TRUE 
                    OR (tor.start_time <= %s AND tor.end_time >= %s)
                )
            LEFT JOIN timesheets ts ON fa.agentId = ts.agentId 
                AND ts.week_start_date = %s
            LEFT JOIN timesheet_slots tss ON ts.timesheet_id = tss.timesheet_id
                AND tss.day_of_week = %s
                AND tss.start_time <= %s 
                AND tss.end_time >= %s
            WHERE fa.agentId NOT IN (
                SELECT COALESCE(b.agentId, 0)
                FROM bookings b
                WHERE b.booking_date = %s
                  AND b.booking_time BETWEEN SUBTIME(%s, %s) AND ADDTIME(%s, %s)
                  AND b.agentId IS NOT NULL
            )
            AND (
                tor.requestId IS NULL  -- Not on time-off
                AND ts.timesheet_id IS NOT NULL  -- Has timesheet
                AND ts.status = 'approved'  -- Timesheet is approved
                AND tss.slot_id IS NOT NULL  -- Available in this time slot
            )
            ORDER BY distance ASC;
        """
        cursor.execute(query, (
            lat, lon, lat, 
            booking_date, booking_time, booking_time,  # time-off check
            week_start_date_str,  # timesheet week
            day_of_week, booking_time, booking_time,  # timesheet slot check
            booking_date, booking_time, booking_period, booking_time, booking_period  # booking conflict check
        ))
        agents = cursor.fetchall()
        
        # If no agents available with strict checking, return all agents with detailed status
        if len(agents) == 0:
            fallback_query = """
                SELECT fa.name, fa.agentId,
                    ROUND((6371 * ACOS(
                        COS(RADIANS(%s)) * COS(RADIANS(l.latitude)) *
                        COS(RADIANS(l.longitude) - RADIANS(%s)) +
                        SIN(RADIANS(%s)) * SIN(RADIANS(l.latitude))
                    )), 1) AS distance,
                    CASE 
                        WHEN tor.requestId IS NOT NULL THEN 'unavailable (time-off)'
                        WHEN ts.timesheet_id IS NULL THEN 'unavailable (no timesheet)'
                        WHEN ts.status != 'approved' THEN 'unavailable (timesheet not approved)'
                        WHEN tss.slot_id IS NULL THEN 'unavailable (not scheduled)'
                        ELSE 'available'
                    END as availability_status,
                    CASE 
                        WHEN tor.requestId IS NOT NULL THEN CONCAT(
                            'Time-off: ',
                            IF(tor.is_full_day, 'Full day', CONCAT(tor.start_time, ' - ', tor.end_time))
                        )
                        WHEN ts.timesheet_id IS NULL THEN 'No timesheet submitted'
                        WHEN ts.status != 'approved' THEN CONCAT('Timesheet status: ', ts.status)
                        WHEN tss.slot_id IS NULL THEN 'Not scheduled for this time'
                        ELSE NULL
                    END as unavailable_reason
                FROM field_agents fa
                INNER JOIN locations l ON fa.location_id = l.id
                LEFT JOIN time_off_requests tor ON fa.agentId = tor.agentId 
                    AND tor.status = 'approved'
                    AND tor.request_date = %s
                    AND (
                        tor.is_full_day = TRUE 
                        OR (tor.start_time <= %s AND tor.end_time >= %s)
                    )
                LEFT JOIN timesheets ts ON fa.agentId = ts.agentId 
                    AND ts.week_start_date = %s
                LEFT JOIN timesheet_slots tss ON ts.timesheet_id = tss.timesheet_id
                    AND tss.day_of_week = %s
                    AND tss.start_time <= %s 
                    AND tss.end_time >= %s
                ORDER BY 
                    CASE 
                        WHEN tor.requestId IS NULL AND ts.timesheet_id IS NOT NULL AND ts.status = 'approved' AND tss.slot_id IS NOT NULL THEN 0
                        ELSE 1 
                    END,
                    distance ASC;
            """
            cursor.execute(fallback_query, (
                lat, lon, lat,
                booking_date, booking_time, booking_time,  # time-off check
                week_start_date_str,  # timesheet week
                day_of_week, booking_time, booking_time  # timesheet slot check
            ))
            agents = cursor.fetchall()

        return jsonify(agents), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
