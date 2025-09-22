from flask import Blueprint, request, jsonify
from functools import wraps
import mysql.connector
from mysql.connector import Error
from db import get_connection
from utils.middleware import require_any_role

teams_bp = Blueprint('teams', __name__, url_prefix='/api')

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

def validate_team_data(data):
    """Validate team creation/update data"""
    if not data.get('name') or not isinstance(data['name'], str):
        return "Team name is required and must be a string"
    
    if len(data['name'].strip()) == 0:
        return "Team name cannot be empty"
    
    if len(data['name']) > 100:
        return "Team name must be 100 characters or less"
    
    if 'description' in data and data['description'] is not None:
        if not isinstance(data['description'], str):
            return "Description must be a string"
        if len(data['description']) > 1000:
            return "Description must be 1000 characters or less"
    
    return None

@teams_bp.route('/teams', methods=['GET'])
@require_any_role('admin', 'dispatcher')
@database_operation
def get_teams(cursor, conn):
    """Get all teams with their members"""
    try:
        # Get all teams with their region information
        teams_query = """
        SELECT t.teamId, t.name, t.description, t.created_time, t.updated_time,
               r.regionId, r.name as region_name, r.is_global as region_is_global
        FROM teams t
        LEFT JOIN regions r ON t.region_id = r.regionId
        ORDER BY t.name
        """
        cursor.execute(teams_query)
        teams = cursor.fetchall()
        
        # Get team members for each team
        for team in teams:
            # Get dispatchers
            dispatcher_query = """
            SELECT dispatcherId as id, name, email, phone 
            FROM dispatchers 
            WHERE team_id = %s
            """
            cursor.execute(dispatcher_query, (team['teamId'],))
            team['dispatchers'] = cursor.fetchall()
            
            # Get agents
            agent_query = """
            SELECT agentId as id, name, email, phone, status 
            FROM field_agents 
            WHERE team_id = %s
            """
            cursor.execute(agent_query, (team['teamId'],))
            team['agents'] = cursor.fetchall()
            
            team['memberCount'] = len(team['dispatchers']) + len(team['agents'])
        
        return jsonify({"success": True, "data": teams}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@teams_bp.route('/teams', methods=['POST'])
@require_any_role('admin')
@database_operation
def create_team(cursor, conn):
    """Create a new team"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Validate input
        validation_error = validate_team_data(data)
        if validation_error:
            return jsonify({"success": False, "error": validation_error}), 400
        
        # Check if team name already exists
        cursor.execute("SELECT teamId FROM teams WHERE name = %s", (data['name'].strip(),))
        if cursor.fetchone():
            return jsonify({"success": False, "error": "Team name already exists"}), 409
        
        # Validate region_id if provided
        region_id = data.get('region_id')
        if region_id is not None:
            cursor.execute("SELECT regionId FROM regions WHERE regionId = %s", (region_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Invalid region ID"}), 400
        else:
            # Default to Global region (regionId = 1)
            region_id = 1
        
        # Insert new team
        insert_query = """
        INSERT INTO teams (name, description, region_id) 
        VALUES (%s, %s, %s)
        """
        cursor.execute(insert_query, (
            data['name'].strip(),
            data.get('description', '').strip() if data.get('description') else None,
            region_id
        ))
        
        team_id = cursor.lastrowid
        conn.commit()
        
        # Return the created team with region information
        cursor.execute("""
            SELECT t.*, r.regionId, r.name as region_name, r.is_global as region_is_global
            FROM teams t
            LEFT JOIN regions r ON t.region_id = r.regionId
            WHERE t.teamId = %s
        """, (team_id,))
        team = cursor.fetchone()
        
        return jsonify({"success": True, "data": team}), 201
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@teams_bp.route('/teams/<int:team_id>', methods=['GET'])
@require_any_role('admin', 'dispatcher')
@database_operation
def get_team(cursor, conn, team_id):
    """Get a specific team with its members"""
    try:
        # Get team details with region information
        team_query = """
        SELECT t.*, r.regionId, r.name as region_name, r.is_global as region_is_global
        FROM teams t
        LEFT JOIN regions r ON t.region_id = r.regionId
        WHERE t.teamId = %s
        """
        cursor.execute(team_query, (team_id,))
        team = cursor.fetchone()
        
        if not team:
            return jsonify({"success": False, "error": "Team not found"}), 404
        
        # Get dispatchers
        cursor.execute("""
        SELECT dispatcherId as id, name, email, phone 
        FROM dispatchers 
        WHERE team_id = %s
        """, (team_id,))
        team['dispatchers'] = cursor.fetchall()
        
        # Get agents
        cursor.execute("""
        SELECT agentId as id, name, email, phone, status 
        FROM field_agents 
        WHERE team_id = %s
        """, (team_id,))
        team['agents'] = cursor.fetchall()
        
        team['memberCount'] = len(team['dispatchers']) + len(team['agents'])
        
        return jsonify({"success": True, "data": team}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@teams_bp.route('/teams/<int:team_id>', methods=['PUT'])
@require_any_role('admin')
@database_operation
def update_team(cursor, conn, team_id):
    """Update a team"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Check if team exists
        cursor.execute("SELECT teamId FROM teams WHERE teamId = %s", (team_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Team not found"}), 404
        
        # Validate input
        validation_error = validate_team_data(data)
        if validation_error:
            return jsonify({"success": False, "error": validation_error}), 400
        
        # Check if new name conflicts with existing team (excluding current)
        cursor.execute("SELECT teamId FROM teams WHERE name = %s AND teamId != %s", 
                      (data['name'].strip(), team_id))
        if cursor.fetchone():
            return jsonify({"success": False, "error": "Team name already exists"}), 409
        
        # Validate region_id if provided
        update_values = [data['name'].strip()]
        set_clauses = ["name = %s"]
        
        # Handle description
        if 'description' in data:
            set_clauses.append("description = %s")
            update_values.append(data.get('description', '').strip() if data.get('description') else None)
        
        # Handle region reassignment
        if 'region_id' in data:
            region_id = data['region_id']
            if region_id is not None:
                cursor.execute("SELECT regionId FROM regions WHERE regionId = %s", (region_id,))
                if not cursor.fetchone():
                    return jsonify({"success": False, "error": "Invalid region ID"}), 400
            
            # Check if team has incomplete appointments before allowing region change
            # First get the team's current region and name
            cursor.execute("SELECT region_id, name FROM teams WHERE teamId = %s", (team_id,))
            current_team = cursor.fetchone()
            
            if current_team and current_team['region_id']:
                # Check for appointments in the current region that are incomplete
                cursor.execute("""
                    SELECT COUNT(*) as count FROM bookings b
                    WHERE b.region_id = %s AND b.status IN ('scheduled', 'in-progress')
                """, (current_team['region_id'],))
                region_result = cursor.fetchone()
                
                if region_result['count'] > 0:
                    return jsonify({
                        "success": False, 
                        "error": f"Cannot change region for team '{current_team['name']}'. There are {region_result['count']} incomplete appointments in the current region. Please complete or reassign these appointments first."
                    }), 400
            
            # Also check for appointments directly assigned to team members
            cursor.execute("""
                SELECT COUNT(*) as count FROM bookings b
                JOIN field_agents fa ON b.agentId = fa.agentId
                WHERE fa.team_id = %s AND b.status IN ('scheduled', 'in-progress')
            """, (team_id,))
            member_result = cursor.fetchone()
            
            if member_result['count'] > 0:
                team_name = current_team['name'] if current_team else 'Unknown'
                return jsonify({
                    "success": False, 
                    "error": f"Cannot change region for team '{team_name}'. There are {member_result['count']} incomplete appointments assigned to team members. Please complete or reassign these appointments first."
                }), 400
            
            set_clauses.append("region_id = %s")
            update_values.append(region_id)
        
        set_clauses.append("updated_time = CURRENT_TIMESTAMP")
        update_values.append(team_id)
        
        # Update team
        update_query = f"""
        UPDATE teams 
        SET {', '.join(set_clauses)}
        WHERE teamId = %s
        """
        cursor.execute(update_query, update_values)
        
        conn.commit()
        
        # Return updated team with region information
        cursor.execute("""
            SELECT t.*, r.regionId, r.name as region_name, r.is_global as region_is_global
            FROM teams t
            LEFT JOIN regions r ON t.region_id = r.regionId
            WHERE t.teamId = %s
        """, (team_id,))
        team = cursor.fetchone()
        
        return jsonify({"success": True, "data": team}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@teams_bp.route('/teams/<int:team_id>', methods=['DELETE'])
@require_any_role('admin')
@database_operation
def delete_team(cursor, conn, team_id):
    """Delete a team (removes team assignments from members)"""
    try:
        # Check if team exists
        cursor.execute("SELECT teamId, name FROM teams WHERE teamId = %s", (team_id,))
        team = cursor.fetchone()
        if not team:
            return jsonify({"success": False, "error": "Team not found"}), 404
        
        # Check for incomplete appointments in the team's region or assigned to team members
        # First get the team's region
        cursor.execute("SELECT region_id FROM teams WHERE teamId = %s", (team_id,))
        team_region = cursor.fetchone()
        
        if team_region and team_region['region_id']:
            # Check for appointments in this team's region that are incomplete
            cursor.execute("""
                SELECT COUNT(*) as count FROM bookings b
                WHERE b.region_id = %s AND b.status IN ('scheduled', 'in-progress')
            """, (team_region['region_id'],))
            region_result = cursor.fetchone()
            
            if region_result['count'] > 0:
                return jsonify({
                    "success": False, 
                    "error": f"Cannot delete team '{team['name']}'. There are {region_result['count']} incomplete appointments in this team's region. Please complete or reassign these appointments first."
                }), 400
        
        # Also check for appointments directly assigned to team members
        cursor.execute("""
            SELECT COUNT(*) as count FROM bookings b
            JOIN field_agents fa ON b.agentId = fa.agentId
            WHERE fa.team_id = %s AND b.status IN ('scheduled', 'in-progress')
        """, (team_id,))
        member_result = cursor.fetchone()
        
        if member_result['count'] > 0:
            return jsonify({
                "success": False, 
                "error": f"Cannot delete team '{team['name']}'. There are {member_result['count']} incomplete appointments assigned to team members. Please complete or reassign these appointments first."
            }), 400
        
        # Remove team assignments from dispatchers and agents
        cursor.execute("UPDATE dispatchers SET team_id = NULL WHERE team_id = %s", (team_id,))
        cursor.execute("UPDATE field_agents SET team_id = NULL WHERE team_id = %s", (team_id,))
        
        # Delete the team
        cursor.execute("DELETE FROM teams WHERE teamId = %s", (team_id,))
        
        conn.commit()
        
        return jsonify({"success": True, "message": "Team deleted successfully"}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@teams_bp.route('/teams/<int:team_id>/members', methods=['POST'])
@require_any_role('admin')
@database_operation
def assign_member_to_team(cursor, conn, team_id):
    """Assign a dispatcher or agent to a team"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        member_type = data.get('type')  # 'dispatcher' or 'agent'
        member_id = data.get('memberId')
        
        if not member_type or member_type not in ['dispatcher', 'agent']:
            return jsonify({"success": False, "error": "Invalid member type. Must be 'dispatcher' or 'agent'"}), 400
        
        if not member_id or not isinstance(member_id, int):
            return jsonify({"success": False, "error": "Valid member ID is required"}), 400
        
        # Check if team exists
        cursor.execute("SELECT teamId FROM teams WHERE teamId = %s", (team_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Team not found"}), 404
        
        # Update member's team assignment
        if member_type == 'dispatcher':
            # Check if dispatcher exists
            cursor.execute("SELECT dispatcherId FROM dispatchers WHERE dispatcherId = %s", (member_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Dispatcher not found"}), 404
            
            cursor.execute("UPDATE dispatchers SET team_id = %s WHERE dispatcherId = %s", 
                          (team_id, member_id))
        else:  # agent
            # Check if agent exists
            cursor.execute("SELECT agentId FROM field_agents WHERE agentId = %s", (member_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "error": "Agent not found"}), 404
            
            cursor.execute("UPDATE field_agents SET team_id = %s WHERE agentId = %s", 
                          (team_id, member_id))
        
        conn.commit()
        
        return jsonify({"success": True, "message": f"{member_type.capitalize()} assigned to team successfully"}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@teams_bp.route('/teams/<int:team_id>/members/<string:member_type>/<int:member_id>', methods=['DELETE'])
@require_any_role('admin')
@database_operation
def remove_member_from_team(cursor, conn, team_id, member_type, member_id):
    """Remove a member from a team"""
    try:
        if member_type not in ['dispatcher', 'agent']:
            return jsonify({"success": False, "error": "Invalid member type. Must be 'dispatcher' or 'agent'"}), 400
        
        # Remove team assignment
        if member_type == 'dispatcher':
            cursor.execute("UPDATE dispatchers SET team_id = NULL WHERE dispatcherId = %s AND team_id = %s", 
                          (member_id, team_id))
        else:  # agent
            cursor.execute("UPDATE field_agents SET team_id = NULL WHERE agentId = %s AND team_id = %s", 
                          (member_id, team_id))
        
        if cursor.rowcount == 0:
            return jsonify({"success": False, "error": "Member not found in this team"}), 404
        
        conn.commit()
        
        return jsonify({"success": True, "message": f"{member_type.capitalize()} removed from team successfully"}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@teams_bp.route('/teams/unassigned', methods=['GET'])
@require_any_role('admin')
@database_operation
def get_unassigned_members(cursor, conn):
    """Get all dispatchers and agents not assigned to any team"""
    try:
        # Get unassigned dispatchers
        cursor.execute("""
        SELECT dispatcherId as id, name, email, phone, 'dispatcher' as type
        FROM dispatchers 
        WHERE team_id IS NULL
        """)
        unassigned_dispatchers = cursor.fetchall()
        
        # Get unassigned agents
        cursor.execute("""
        SELECT agentId as id, name, email, phone, status, 'agent' as type
        FROM field_agents 
        WHERE team_id IS NULL
        """)
        unassigned_agents = cursor.fetchall()
        
        result = {
            "dispatchers": unassigned_dispatchers,
            "agents": unassigned_agents,
            "total": len(unassigned_dispatchers) + len(unassigned_agents)
        }
        
        return jsonify({"success": True, "data": result}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500