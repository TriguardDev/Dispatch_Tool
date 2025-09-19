from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime, time
from db import get_connection
from utils.middleware import require_any_role
from utils.async_notifier import send_notifications_async

timeoff_bp = Blueprint('timeoff', __name__, url_prefix='/api')

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

def validate_time_off_request(data):
    """Validate time-off request data"""
    if not data.get('request_date'):
        return "Request date is required"
    
    # Parse date
    try:
        request_date = datetime.strptime(data['request_date'], '%Y-%m-%d').date()
        if request_date <= datetime.now().date():
            return "Cannot request time-off for today or past dates"
    except ValueError:
        return "Invalid date format. Use YYYY-MM-DD"
    
    is_full_day = data.get('is_full_day', False)
    
    if not is_full_day:
        # Validate 2-hour period
        if not data.get('start_time') or not data.get('end_time'):
            return "Start time and end time are required for partial day requests"
        
        try:
            start_time = datetime.strptime(data['start_time'], '%H:%M').time()
            end_time = datetime.strptime(data['end_time'], '%H:%M').time()
            
            # Validate business hours (10am - 8pm)
            business_start = time(10, 0)  # 10:00 AM
            business_end = time(20, 0)    # 8:00 PM
            
            if start_time < business_start or end_time > business_end:
                return "Time-off must be within business hours (10:00 AM - 8:00 PM)"
            
            if start_time >= end_time:
                return "End time must be after start time"
            
            # Calculate duration
            start_minutes = start_time.hour * 60 + start_time.minute
            end_minutes = end_time.hour * 60 + end_time.minute
            duration_minutes = end_minutes - start_minutes
            
            if duration_minutes != 120:  # Exactly 2 hours
                return "Time-off period must be exactly 2 hours"
                
        except ValueError:
            return "Invalid time format. Use HH:MM"
    
    return None

def check_overlapping_requests(cursor, agent_id, request_date, start_time=None, end_time=None, exclude_request_id=None):
    """Check for overlapping time-off requests"""
    base_query = """
    SELECT requestId FROM time_off_requests 
    WHERE agentId = %s AND request_date = %s AND status IN ('pending', 'approved')
    """
    params = [agent_id, request_date]
    
    if exclude_request_id:
        base_query += " AND requestId != %s"
        params.append(exclude_request_id)
    
    if start_time and end_time:
        # Check for time conflicts
        base_query += """
        AND (
            is_full_day = TRUE OR
            (start_time < %s AND end_time > %s) OR
            (start_time < %s AND end_time > %s) OR
            (start_time >= %s AND start_time < %s)
        )
        """
        params.extend([end_time, start_time, start_time, end_time, start_time, end_time])
    else:
        # Full day request - conflicts with any existing request
        base_query += " AND (is_full_day = TRUE OR start_time IS NOT NULL)"
    
    cursor.execute(base_query, params)
    return cursor.fetchone() is not None

@timeoff_bp.route('/time-off/requests', methods=['POST'])
@require_any_role('field_agent')
@database_operation
def create_time_off_request(cursor, conn):
    """Create a new time-off request"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        agent_id = request.user_id
        
        # Check if agent has a team
        cursor.execute("SELECT team_id FROM field_agents WHERE agentId = %s", (agent_id,))
        agent = cursor.fetchone()
        if not agent or not agent['team_id']:
            return jsonify({"success": False, "error": "You must be assigned to a team to request time-off"}), 400
        
        # Validate input
        validation_error = validate_time_off_request(data)
        if validation_error:
            return jsonify({"success": False, "error": validation_error}), 400
        
        # Check for overlapping requests
        request_date = datetime.strptime(data['request_date'], '%Y-%m-%d').date()
        is_full_day = data.get('is_full_day', False)
        start_time = data.get('start_time') if not is_full_day else None
        end_time = data.get('end_time') if not is_full_day else None
        
        if check_overlapping_requests(cursor, agent_id, request_date, start_time, end_time):
            return jsonify({"success": False, "error": "You already have a time-off request for this date/time"}), 409
        
        # Insert request
        insert_query = """
        INSERT INTO time_off_requests (
            agentId, request_date, start_time, end_time, is_full_day, reason, requested_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (
            agent_id,
            request_date,
            start_time,
            end_time,
            is_full_day,
            data.get('reason', ''),
            agent_id
        ))
        
        request_id = cursor.lastrowid
        conn.commit()
        
        # Get the created request with agent details
        cursor.execute("""
        SELECT tor.*, fa.name as agent_name, fa.email as agent_email
        FROM time_off_requests tor
        JOIN field_agents fa ON tor.agentId = fa.agentId
        WHERE tor.requestId = %s
        """, (request_id,))
        
        created_request = cursor.fetchone()
        
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
                    'type': 'time_off_requested',
                    'agent_name': created_request['agent_name'],
                    'request_date': str(created_request['request_date']),
                    'is_full_day': created_request['is_full_day'],
                    'start_time': str(created_request['start_time']) if created_request['start_time'] else None,
                    'end_time': str(created_request['end_time']) if created_request['end_time'] else None,
                    'dispatcher_email': dispatcher['email'],
                    'dispatcher_name': dispatcher['name']
                }
                send_notifications_async([notification_data])
        except Exception as e:
            print(f"Failed to send notification: {e}")
        
        return jsonify({"success": True, "data": created_request}), 201
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@timeoff_bp.route('/time-off/requests', methods=['GET'])
@require_any_role('field_agent', 'dispatcher', 'admin')
@database_operation
def get_time_off_requests(cursor, conn):
    """Get time-off requests based on user role"""
    try:
        user_role = request.role
        user_id = request.user_id
        
        base_query = """
        SELECT 
            tor.*,
            fa.name as agent_name,
            fa.email as agent_email,
            CASE 
                WHEN tor.reviewer_type = 'dispatcher' THEN d.name
                WHEN tor.reviewer_type = 'admin' THEN a.name
                ELSE NULL
            END as reviewer_name
        FROM time_off_requests tor
        JOIN field_agents fa ON tor.agentId = fa.agentId
        LEFT JOIN dispatchers d ON tor.reviewed_by = d.dispatcherId AND tor.reviewer_type = 'dispatcher'
        LEFT JOIN admins a ON tor.reviewed_by = a.adminId AND tor.reviewer_type = 'admin'
        """
        
        if user_role == 'field_agent':
            # Agents see only their own requests
            query = base_query + " WHERE tor.agentId = %s ORDER BY tor.created_time DESC"
            params = [user_id]
        elif user_role == 'dispatcher':
            # Dispatchers see requests from agents in their team
            query = base_query + """
            WHERE fa.team_id = (SELECT team_id FROM dispatchers WHERE dispatcherId = %s)
            ORDER BY tor.created_time DESC
            """
            params = [user_id]
        else:  # admin
            # Admins see all requests
            query = base_query + " ORDER BY tor.created_time DESC"
            params = []
        
        cursor.execute(query, params)
        requests = cursor.fetchall()
        
        # Convert date/time objects to strings for JSON serialization
        for req in requests:
            if req['request_date']:
                req['request_date'] = str(req['request_date'])
            if req['start_time']:
                req['start_time'] = str(req['start_time'])
            if req['end_time']:
                req['end_time'] = str(req['end_time'])
            if req['created_time']:
                req['created_time'] = req['created_time'].isoformat()
            if req['updated_time']:
                req['updated_time'] = req['updated_time'].isoformat()
        
        return jsonify({"success": True, "data": requests}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@timeoff_bp.route('/time-off/requests/<int:request_id>', methods=['PUT'])
@require_any_role('field_agent', 'dispatcher', 'admin')
@database_operation
def update_time_off_request(cursor, conn, request_id):
    """Update time-off request (approve/reject/cancel)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        user_role = request.role
        user_id = request.user_id
        action = data.get('action')  # 'approve', 'reject', 'cancel'
        
        if action not in ['approve', 'reject', 'cancel']:
            return jsonify({"success": False, "error": "Invalid action"}), 400
        
        # Get the request details
        cursor.execute("""
        SELECT tor.*, fa.name as agent_name, fa.email as agent_email, fa.team_id
        FROM time_off_requests tor
        JOIN field_agents fa ON tor.agentId = fa.agentId
        WHERE tor.requestId = %s
        """, (request_id,))
        
        time_off_request = cursor.fetchone()
        if not time_off_request:
            return jsonify({"success": False, "error": "Time-off request not found"}), 404
        
        # Permission checks
        if action == 'cancel':
            # Only the requesting agent can cancel
            if user_role != 'field_agent' or user_id != time_off_request['agentId']:
                return jsonify({"success": False, "error": "Only the requesting agent can cancel"}), 403
            if time_off_request['status'] not in ['pending', 'approved']:
                return jsonify({"success": False, "error": "Cannot cancel this request"}), 400
        
        elif action in ['approve', 'reject']:
            # Dispatchers can only approve/reject requests from their team
            if user_role == 'dispatcher':
                cursor.execute("SELECT team_id FROM dispatchers WHERE dispatcherId = %s", (user_id,))
                dispatcher = cursor.fetchone()
                if not dispatcher or dispatcher['team_id'] != time_off_request['team_id']:
                    return jsonify({"success": False, "error": "You can only review requests from your team"}), 403
            
            if time_off_request['status'] != 'pending':
                return jsonify({"success": False, "error": "Request has already been reviewed"}), 400
        
        # Update the request
        new_status = 'cancelled' if action == 'cancel' else ('approved' if action == 'approve' else 'rejected')
        
        update_query = """
        UPDATE time_off_requests 
        SET status = %s, reviewed_by = %s, reviewer_type = %s, updated_time = CURRENT_TIMESTAMP
        WHERE requestId = %s
        """
        
        reviewer_type = None if action == 'cancel' else user_role
        reviewed_by = None if action == 'cancel' else user_id
        
        cursor.execute(update_query, (new_status, reviewed_by, reviewer_type, request_id))
        conn.commit()
        
        # Get updated request
        cursor.execute("""
        SELECT 
            tor.*,
            fa.name as agent_name,
            fa.email as agent_email,
            CASE 
                WHEN tor.reviewer_type = 'dispatcher' THEN d.name
                WHEN tor.reviewer_type = 'admin' THEN a.name
                ELSE NULL
            END as reviewer_name
        FROM time_off_requests tor
        JOIN field_agents fa ON tor.agentId = fa.agentId
        LEFT JOIN dispatchers d ON tor.reviewed_by = d.dispatcherId AND tor.reviewer_type = 'dispatcher'
        LEFT JOIN admins a ON tor.reviewed_by = a.adminId AND tor.reviewer_type = 'admin'
        WHERE tor.requestId = %s
        """, (request_id,))
        
        updated_request = cursor.fetchone()
        
        # Send notification (async)
        try:
            notification_data = {
                'type': f'time_off_{new_status}',
                'agent_email': updated_request['agent_email'],
                'agent_name': updated_request['agent_name'],
                'request_date': str(updated_request['request_date']),
                'is_full_day': updated_request['is_full_day'],
                'start_time': str(updated_request['start_time']) if updated_request['start_time'] else None,
                'end_time': str(updated_request['end_time']) if updated_request['end_time'] else None,
                'reviewer_name': updated_request.get('reviewer_name', 'System')
            }
            send_notifications_async([notification_data])
        except Exception as e:
            print(f"Failed to send notification: {e}")
        
        # Convert for JSON response
        if updated_request['request_date']:
            updated_request['request_date'] = str(updated_request['request_date'])
        if updated_request['start_time']:
            updated_request['start_time'] = str(updated_request['start_time'])
        if updated_request['end_time']:
            updated_request['end_time'] = str(updated_request['end_time'])
        if updated_request['created_time']:
            updated_request['created_time'] = updated_request['created_time'].isoformat()
        if updated_request['updated_time']:
            updated_request['updated_time'] = updated_request['updated_time'].isoformat()
        
        return jsonify({"success": True, "data": updated_request}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@timeoff_bp.route('/time-off/requests/<int:request_id>', methods=['DELETE'])
@require_any_role('admin')
@database_operation
def delete_time_off_request(cursor, conn, request_id):
    """Delete time-off request (admin only)"""
    try:
        # Check if request exists
        cursor.execute("SELECT requestId FROM time_off_requests WHERE requestId = %s", (request_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Time-off request not found"}), 404
        
        cursor.execute("DELETE FROM time_off_requests WHERE requestId = %s", (request_id,))
        conn.commit()
        
        return jsonify({"success": True, "message": "Time-off request deleted successfully"}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500