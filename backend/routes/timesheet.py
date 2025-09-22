from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime, timedelta, time
from db import get_connection
from utils.middleware import require_any_role
from utils.async_notifier import send_notifications_async

timesheet_bp = Blueprint('timesheet', __name__, url_prefix='/api')

def database_operation(f):
    """Decorator to handle database connection and cleanup consistently"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            return f(cursor, conn, *args, **kwargs)
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    return decorated_function

def get_current_week_monday():
    """Get the Monday of the current week"""
    today = datetime.now().date()
    days_since_monday = today.weekday()  # Monday is 0
    return today - timedelta(days=days_since_monday)

def get_next_week_monday():
    """Get the Monday of next week"""
    current_monday = get_current_week_monday()
    return current_monday + timedelta(days=7)

def get_target_week_monday(agent_id, cursor):
    """
    Determine which week the agent should be submitting for.
    Logic:
    1. If no current week timesheet exists -> submit for current week
    2. If current week timesheet exists and approved -> submit for next week
    3. If current week timesheet exists but not approved -> can modify current week
    """
    current_monday = get_current_week_monday()
    next_monday = get_next_week_monday()
    
    # Check current week timesheet
    cursor.execute("""
        SELECT timesheet_id, status FROM timesheets 
        WHERE agentId = %s AND week_start_date = %s
    """, (agent_id, current_monday))
    current_week_timesheet = cursor.fetchone()
    
    if not current_week_timesheet:
        # No current week timesheet - submit for current week
        return current_monday, "current"
    elif current_week_timesheet['status'] == 'approved':
        # Current week approved - submit for next week
        return next_monday, "next"
    else:
        # Current week exists but not approved - can modify current week
        return current_monday, "current"

def validate_timesheet_data(data):
    """Validate timesheet submission data"""
    if not data.get('slots'):
        return "At least one time slot is required"
    
    slots = data['slots']
    if not isinstance(slots, list) or len(slots) == 0:
        return "Slots must be a non-empty array"
    
    valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    for slot in slots:
        # Validate required fields
        if not all(k in slot for k in ['day_of_week', 'start_time', 'end_time']):
            return "Each slot must have day_of_week, start_time, and end_time"
        
        # Validate day
        if slot['day_of_week'] not in valid_days:
            return f"Invalid day_of_week: {slot['day_of_week']}"
        
        # Validate time format and 2-hour duration
        try:
            start_time = datetime.strptime(slot['start_time'], '%H:%M').time()
            end_time = datetime.strptime(slot['end_time'], '%H:%M').time()
            
            # Validate business hours (10am - 8pm)
            business_start = time(10, 0)
            business_end = time(20, 0)
            
            if start_time < business_start or end_time > business_end:
                return "All time slots must be within business hours (10:00 AM - 8:00 PM)"
            
            if start_time >= end_time:
                return "End time must be after start time"
            
            # Calculate duration (must be exactly 2 hours)
            start_minutes = start_time.hour * 60 + start_time.minute
            end_minutes = end_time.hour * 60 + end_time.minute
            duration_minutes = end_minutes - start_minutes
            
            if duration_minutes != 120:
                return f"Each time slot must be exactly 2 hours. Found {duration_minutes} minutes for {slot['day_of_week']} {slot['start_time']}-{slot['end_time']}"
                
        except ValueError:
            return f"Invalid time format in slot. Use HH:MM format"
    
    return None

def check_submission_deadline(target_week_type):
    """
    Check if submission is allowed based on deadline rules.
    Rules:
    - For current week: Can submit until Sunday 7pm of current week
    - For next week: Can submit Monday-Sunday 7pm of current week
    """
    now = datetime.now()
    
    if target_week_type == "current":
        # Submitting for current week - deadline is Sunday 7pm of THIS week
        current_monday = get_current_week_monday()
        current_sunday = current_monday + timedelta(days=6)
        deadline = datetime.combine(current_sunday, datetime.min.time().replace(hour=19))
        return now <= deadline
    else:  # target_week_type == "next"
        # Submitting for next week - deadline is Sunday 7pm of current week
        if now.weekday() == 6 and now.hour >= 19:  # Sunday 7pm or later
            return False
        return True

@timesheet_bp.route('/timesheet/submit', methods=['POST'])
@require_any_role('field_agent')
@database_operation
def submit_timesheet(cursor, conn):
    """Submit timesheet for the upcoming week"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        agent_id = request.user_id
        
        # Check if agent has a team
        cursor.execute("SELECT team_id FROM field_agents WHERE agentId = %s", (agent_id,))
        agent = cursor.fetchone()
        if not agent or not agent['team_id']:
            return jsonify({"success": False, "error": "You must be assigned to a team to submit timesheets"}), 400
        
        # Determine target week and check deadline
        target_week_start, target_week_type = get_target_week_monday(agent_id, cursor)
        
        if not check_submission_deadline(target_week_type):
            if target_week_type == "current":
                return jsonify({
                    "success": False, 
                    "error": "Timesheet submission deadline for this week has passed (Sunday 7PM)."
                }), 400
            else:
                return jsonify({
                    "success": False, 
                    "error": "Timesheet submission deadline has passed. Please contact your dispatcher."
                }), 400
        
        # Validate input
        validation_error = validate_timesheet_data(data)
        if validation_error:
            return jsonify({"success": False, "error": validation_error}), 400
        
        # Check if timesheet already exists for target week
        cursor.execute("""
            SELECT timesheet_id, status FROM timesheets 
            WHERE agentId = %s AND week_start_date = %s
        """, (agent_id, target_week_start))
        existing_timesheet = cursor.fetchone()
        
        if existing_timesheet:
            if existing_timesheet['status'] == 'approved':
                return jsonify({
                    "success": False, 
                    "error": "Cannot modify approved timesheet. Contact your dispatcher if changes are needed."
                }), 400
            
            # Delete existing timesheet and slots to replace
            cursor.execute("DELETE FROM timesheets WHERE timesheet_id = %s", (existing_timesheet['timesheet_id'],))
        
        # Create new timesheet
        cursor.execute("""
            INSERT INTO timesheets (agentId, week_start_date, status, submitted_at)
            VALUES (%s, %s, 'pending', NOW())
        """, (agent_id, target_week_start))
        
        timesheet_id = cursor.lastrowid
        
        # Insert time slots
        for slot in data['slots']:
            cursor.execute("""
                INSERT INTO timesheet_slots (timesheet_id, day_of_week, start_time, end_time)
                VALUES (%s, %s, %s, %s)
            """, (timesheet_id, slot['day_of_week'], slot['start_time'], slot['end_time']))
        
        conn.commit()
        
        # Get the created timesheet with agent details
        cursor.execute("""
            SELECT t.*, fa.name as agent_name, fa.email as agent_email
            FROM timesheets t
            JOIN field_agents fa ON t.agentId = fa.agentId
            WHERE t.timesheet_id = %s
        """, (timesheet_id,))
        created_timesheet = cursor.fetchone()
        
        # Send notification to dispatcher (async)
        try:
            cursor.execute("""
                SELECT d.email, d.name 
                FROM dispatchers d 
                JOIN field_agents fa ON d.team_id = fa.team_id 
                WHERE fa.agentId = %s
            """, (agent_id,))
            dispatcher = cursor.fetchone()
            
            if dispatcher:
                notification_data = {
                    'type': 'timesheet_submitted',
                    'agent_name': created_timesheet['agent_name'],
                    'week_start_date': str(created_timesheet['week_start_date']),
                    'dispatcher_email': dispatcher['email'],
                    'dispatcher_name': dispatcher['name']
                }
                send_notifications_async([notification_data])
        except Exception as e:
            print(f"Failed to send notification: {e}")
        
        return jsonify({
            "success": True, 
            "message": "Timesheet submitted successfully",
            "data": created_timesheet
        }), 201
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@timesheet_bp.route('/timesheet/current', methods=['GET'])
@require_any_role('field_agent', 'dispatcher', 'admin')
@database_operation
def get_current_timesheet(cursor, conn):
    """Get timesheet for the target week (current or next based on approval status)"""
    try:
        user_role = request.role
        user_id = request.user_id
        
        # For field agents, get their own timesheet
        # For dispatchers/admins, get agent_id from query params
        agent_id = user_id
        if user_role in ['dispatcher', 'admin']:
            agent_id = request.args.get('agent_id', user_id)
        
        # Determine which week to show based on approval status
        target_week_start, target_week_type = get_target_week_monday(agent_id, cursor)
        
        # Get timesheet with slots
        cursor.execute("""
            SELECT t.*, fa.name as agent_name, fa.email as agent_email,
                   CASE 
                       WHEN t.reviewer_type = 'dispatcher' THEN d.name
                       WHEN t.reviewer_type = 'admin' THEN a.name
                       ELSE NULL
                   END as reviewer_name
            FROM timesheets t
            JOIN field_agents fa ON t.agentId = fa.agentId
            LEFT JOIN dispatchers d ON t.reviewed_by = d.dispatcherId AND t.reviewer_type = 'dispatcher'
            LEFT JOIN admins a ON t.reviewed_by = a.adminId AND t.reviewer_type = 'admin'
            WHERE t.agentId = %s AND t.week_start_date = %s
        """, (agent_id, target_week_start))
        
        timesheet = cursor.fetchone()
        
        if not timesheet:
            return jsonify({
                "success": True, 
                "data": None,
                "target_week_start": str(target_week_start),
                "target_week_type": target_week_type,
                "message": f"No timesheet found for {target_week_type} week"
            }), 200
        
        # Get slots for this timesheet
        cursor.execute("""
            SELECT day_of_week, start_time, end_time
            FROM timesheet_slots
            WHERE timesheet_id = %s
            ORDER BY 
                FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
                start_time
        """, (timesheet['timesheet_id'],))
        
        slots = cursor.fetchall()
        
        # Convert time objects to strings
        for slot in slots:
            slot['start_time'] = str(slot['start_time'])
            slot['end_time'] = str(slot['end_time'])
        
        # Convert timestamps
        if timesheet['submitted_at']:
            timesheet['submitted_at'] = timesheet['submitted_at'].isoformat()
        if timesheet['reviewed_at']:
            timesheet['reviewed_at'] = timesheet['reviewed_at'].isoformat()
        if timesheet['created_time']:
            timesheet['created_time'] = timesheet['created_time'].isoformat()
        if timesheet['updated_time']:
            timesheet['updated_time'] = timesheet['updated_time'].isoformat()
        
        timesheet['week_start_date'] = str(timesheet['week_start_date'])
        timesheet['slots'] = slots
        timesheet['target_week_type'] = target_week_type
        
        return jsonify({
            "success": True, 
            "data": timesheet,
            "target_week_type": target_week_type
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@timesheet_bp.route('/timesheet/pending', methods=['GET'])
@require_any_role('dispatcher', 'admin')
@database_operation
def get_pending_timesheets(cursor, conn):
    """Get pending timesheets for review"""
    try:
        user_role = request.role
        user_id = request.user_id
        
        base_query = """
            SELECT t.*, fa.name as agent_name, fa.email as agent_email
            FROM timesheets t
            JOIN field_agents fa ON t.agentId = fa.agentId
            WHERE t.status = 'pending'
        """
        
        if user_role == 'dispatcher':
            # Dispatchers see only their team's timesheets
            query = base_query + """
                AND fa.team_id = (SELECT team_id FROM dispatchers WHERE dispatcherId = %s)
            """
            params = [user_id]
        else:  # admin
            # Admins see all pending timesheets
            query = base_query
            params = []
        
        query += " ORDER BY t.submitted_at ASC"
        
        cursor.execute(query, params)
        timesheets = cursor.fetchall()
        
        # Get slots for each timesheet
        for timesheet in timesheets:
            cursor.execute("""
                SELECT day_of_week, start_time, end_time
                FROM timesheet_slots
                WHERE timesheet_id = %s
                ORDER BY 
                    FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
                    start_time
            """, (timesheet['timesheet_id'],))
            
            slots = cursor.fetchall()
            
            # Convert time objects to strings
            for slot in slots:
                slot['start_time'] = str(slot['start_time'])
                slot['end_time'] = str(slot['end_time'])
            
            timesheet['slots'] = slots
            
            # Convert timestamps
            if timesheet['submitted_at']:
                timesheet['submitted_at'] = timesheet['submitted_at'].isoformat()
            if timesheet['created_time']:
                timesheet['created_time'] = timesheet['created_time'].isoformat()
            if timesheet['updated_time']:
                timesheet['updated_time'] = timesheet['updated_time'].isoformat()
            
            timesheet['week_start_date'] = str(timesheet['week_start_date'])
        
        return jsonify({"success": True, "data": timesheets}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@timesheet_bp.route('/timesheet/<int:timesheet_id>/review', methods=['PUT'])
@require_any_role('dispatcher', 'admin')
@database_operation
def review_timesheet(cursor, conn, timesheet_id):
    """Approve or reject a timesheet"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        user_role = request.role
        user_id = request.user_id
        action = data.get('action')  # 'approve' or 'reject'
        
        if action not in ['approve', 'reject']:
            return jsonify({"success": False, "error": "Invalid action"}), 400
        
        # Get the timesheet details
        cursor.execute("""
            SELECT t.*, fa.name as agent_name, fa.email as agent_email, fa.team_id
            FROM timesheets t
            JOIN field_agents fa ON t.agentId = fa.agentId
            WHERE t.timesheet_id = %s
        """, (timesheet_id,))
        
        timesheet = cursor.fetchone()
        if not timesheet:
            return jsonify({"success": False, "error": "Timesheet not found"}), 404
        
        # Permission checks
        if user_role == 'dispatcher':
            cursor.execute("SELECT team_id FROM dispatchers WHERE dispatcherId = %s", (user_id,))
            dispatcher = cursor.fetchone()
            if not dispatcher or dispatcher['team_id'] != timesheet['team_id']:
                return jsonify({"success": False, "error": "You can only review timesheets from your team"}), 403
        
        if timesheet['status'] != 'pending':
            return jsonify({"success": False, "error": "Timesheet has already been reviewed"}), 400
        
        # Update the timesheet
        new_status = 'approved' if action == 'approve' else 'rejected'
        
        cursor.execute("""
            UPDATE timesheets 
            SET status = %s, reviewed_by = %s, reviewer_type = %s, reviewed_at = NOW(), updated_time = NOW()
            WHERE timesheet_id = %s
        """, (new_status, user_id, user_role, timesheet_id))
        
        conn.commit()
        
        # Get updated timesheet
        cursor.execute("""
            SELECT t.*, fa.name as agent_name, fa.email as agent_email,
                   CASE 
                       WHEN t.reviewer_type = 'dispatcher' THEN d.name
                       WHEN t.reviewer_type = 'admin' THEN a.name
                       ELSE NULL
                   END as reviewer_name
            FROM timesheets t
            JOIN field_agents fa ON t.agentId = fa.agentId
            LEFT JOIN dispatchers d ON t.reviewed_by = d.dispatcherId AND t.reviewer_type = 'dispatcher'
            LEFT JOIN admins a ON t.reviewed_by = a.adminId AND t.reviewer_type = 'admin'
            WHERE t.timesheet_id = %s
        """, (timesheet_id,))
        
        updated_timesheet = cursor.fetchone()
        
        # Send notification (async)
        try:
            notification_data = {
                'type': f'timesheet_{new_status}',
                'agent_email': updated_timesheet['agent_email'],
                'agent_name': updated_timesheet['agent_name'],
                'week_start_date': str(updated_timesheet['week_start_date']),
                'reviewer_name': updated_timesheet.get('reviewer_name', 'System')
            }
            send_notifications_async([notification_data])
        except Exception as e:
            print(f"Failed to send notification: {e}")
        
        # Convert for JSON response
        if updated_timesheet['submitted_at']:
            updated_timesheet['submitted_at'] = updated_timesheet['submitted_at'].isoformat()
        if updated_timesheet['reviewed_at']:
            updated_timesheet['reviewed_at'] = updated_timesheet['reviewed_at'].isoformat()
        if updated_timesheet['created_time']:
            updated_timesheet['created_time'] = updated_timesheet['created_time'].isoformat()
        if updated_timesheet['updated_time']:
            updated_timesheet['updated_time'] = updated_timesheet['updated_time'].isoformat()
        
        updated_timesheet['week_start_date'] = str(updated_timesheet['week_start_date'])
        
        return jsonify({"success": True, "data": updated_timesheet}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500