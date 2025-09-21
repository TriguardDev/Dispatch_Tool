from flask import Blueprint, request, jsonify
from functools import wraps
import mysql.connector
from mysql.connector import Error
from db import get_connection
from utils.middleware import require_any_role

regions_bp = Blueprint('regions', __name__, url_prefix='/api')

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

def validate_region_data(data):
    """Validate region creation/update data"""
    if not data.get('name') or not isinstance(data['name'], str):
        return "Region name is required and must be a string"
    
    if len(data['name'].strip()) == 0:
        return "Region name cannot be empty"
    
    if len(data['name']) > 100:
        return "Region name must be 100 characters or less"
    
    if 'description' in data and data['description'] is not None:
        if not isinstance(data['description'], str):
            return "Description must be a string"
        if len(data['description']) > 1000:
            return "Description must be 1000 characters or less"
    
    # Prevent creating/updating non-global regions with name "Global"
    if data['name'].strip().lower() == 'global' and not data.get('is_global', False):
        return "Only the global region can be named 'Global'"
    
    return None

@regions_bp.route('/regions', methods=['GET'])
@require_any_role('admin', 'dispatcher')
@database_operation
def get_regions(cursor, conn):
    """Get all regions"""
    try:
        regions_query = """
        SELECT regionId, name, description, is_global, created_time, updated_time 
        FROM regions 
        ORDER BY is_global DESC, name
        """
        cursor.execute(regions_query)
        regions = cursor.fetchall()
        
        # Get team count for each region
        for region in regions:
            team_count_query = """
            SELECT COUNT(*) as team_count 
            FROM teams 
            WHERE region_id = %s
            """
            cursor.execute(team_count_query, (region['regionId'],))
            team_count_result = cursor.fetchone()
            region['team_count'] = team_count_result['team_count'] if team_count_result else 0
            
            # Get booking count for each region
            booking_count_query = """
            SELECT COUNT(*) as booking_count 
            FROM bookings 
            WHERE region_id = %s
            """
            cursor.execute(booking_count_query, (region['regionId'],))
            booking_count_result = cursor.fetchone()
            region['booking_count'] = booking_count_result['booking_count'] if booking_count_result else 0
        
        return jsonify({"success": True, "data": regions}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@regions_bp.route('/regions', methods=['POST'])
@require_any_role('admin')
@database_operation
def create_region(cursor, conn):
    """Create a new region (admin only)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Validate input
        validation_error = validate_region_data(data)
        if validation_error:
            return jsonify({"success": False, "error": validation_error}), 400
        
        # Check if region name already exists
        cursor.execute("SELECT regionId FROM regions WHERE name = %s", (data['name'].strip(),))
        if cursor.fetchone():
            return jsonify({"success": False, "error": "Region name already exists"}), 409
        
        # Prevent creating multiple global regions
        if data.get('is_global', False):
            cursor.execute("SELECT regionId FROM regions WHERE is_global = TRUE")
            if cursor.fetchone():
                return jsonify({"success": False, "error": "A global region already exists"}), 409
        
        # Insert new region
        insert_query = """
        INSERT INTO regions (name, description, is_global) 
        VALUES (%s, %s, %s)
        """
        cursor.execute(insert_query, (
            data['name'].strip(),
            data.get('description', '').strip() if data.get('description') else None,
            data.get('is_global', False)
        ))
        
        region_id = cursor.lastrowid
        conn.commit()
        
        # Return the created region
        cursor.execute("SELECT * FROM regions WHERE regionId = %s", (region_id,))
        region = cursor.fetchone()
        
        return jsonify({"success": True, "data": region}), 201
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@regions_bp.route('/regions/<int:region_id>', methods=['GET'])
@require_any_role('admin', 'dispatcher')
@database_operation
def get_region(cursor, conn, region_id):
    """Get a specific region with its teams"""
    try:
        # Get region details
        cursor.execute("SELECT * FROM regions WHERE regionId = %s", (region_id,))
        region = cursor.fetchone()
        
        if not region:
            return jsonify({"success": False, "error": "Region not found"}), 404
        
        # Get teams in this region
        teams_query = """
        SELECT teamId, name, description, created_time, updated_time
        FROM teams 
        WHERE region_id = %s
        ORDER BY name
        """
        cursor.execute(teams_query, (region_id,))
        region['teams'] = cursor.fetchall()
        
        # Get booking count for this region
        cursor.execute("SELECT COUNT(*) as booking_count FROM bookings WHERE region_id = %s", (region_id,))
        booking_count_result = cursor.fetchone()
        region['booking_count'] = booking_count_result['booking_count'] if booking_count_result else 0
        
        return jsonify({"success": True, "data": region}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@regions_bp.route('/regions/<int:region_id>', methods=['PUT'])
@require_any_role('admin')
@database_operation
def update_region(cursor, conn, region_id):
    """Update a region (admin only)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Check if region exists
        cursor.execute("SELECT regionId, is_global FROM regions WHERE regionId = %s", (region_id,))
        existing_region = cursor.fetchone()
        if not existing_region:
            return jsonify({"success": False, "error": "Region not found"}), 404
        
        # Prevent modifying global flag of existing global region
        if existing_region['is_global'] and 'is_global' in data and not data['is_global']:
            return jsonify({"success": False, "error": "Cannot remove global flag from the global region"}), 400
        
        # Validate input
        validation_error = validate_region_data(data)
        if validation_error:
            return jsonify({"success": False, "error": validation_error}), 400
        
        # Check if new name conflicts with existing region (excluding current)
        cursor.execute("SELECT regionId FROM regions WHERE name = %s AND regionId != %s", 
                      (data['name'].strip(), region_id))
        if cursor.fetchone():
            return jsonify({"success": False, "error": "Region name already exists"}), 409
        
        # Update region
        update_query = """
        UPDATE regions 
        SET name = %s, description = %s, updated_time = CURRENT_TIMESTAMP 
        WHERE regionId = %s
        """
        cursor.execute(update_query, (
            data['name'].strip(),
            data.get('description', '').strip() if data.get('description') else None,
            region_id
        ))
        
        conn.commit()
        
        # Return updated region
        cursor.execute("SELECT * FROM regions WHERE regionId = %s", (region_id,))
        region = cursor.fetchone()
        
        return jsonify({"success": True, "data": region}), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@regions_bp.route('/regions/<int:region_id>', methods=['DELETE'])
@require_any_role('admin')
@database_operation
def delete_region(cursor, conn, region_id):
    """Delete a region (admin only) - moves teams and bookings to Global region"""
    try:
        # Check if region exists and is not global
        cursor.execute("SELECT regionId, is_global, name FROM regions WHERE regionId = %s", (region_id,))
        region = cursor.fetchone()
        if not region:
            return jsonify({"success": False, "error": "Region not found"}), 404
        
        if region['is_global']:
            return jsonify({"success": False, "error": "Cannot delete the global region"}), 400
        
        # Get the global region ID
        cursor.execute("SELECT regionId FROM regions WHERE is_global = TRUE")
        global_region = cursor.fetchone()
        if not global_region:
            return jsonify({"success": False, "error": "Global region not found"}), 500
        
        global_region_id = global_region['regionId']
        
        # Move all teams in this region to global region
        cursor.execute("UPDATE teams SET region_id = %s WHERE region_id = %s", 
                      (global_region_id, region_id))
        
        # Move all bookings in this region to global region
        cursor.execute("UPDATE bookings SET region_id = %s WHERE region_id = %s", 
                      (global_region_id, region_id))
        
        # Delete the region
        cursor.execute("DELETE FROM regions WHERE regionId = %s", (region_id,))
        
        conn.commit()
        
        return jsonify({
            "success": True, 
            "message": f"Region '{region['name']}' deleted successfully. Teams and bookings moved to Global region."
        }), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500

@regions_bp.route('/regions/<int:region_id>/teams', methods=['POST'])
@require_any_role('admin')
@database_operation
def assign_team_to_region(cursor, conn, region_id):
    """Assign a team to a region (admin only)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        team_id = data.get('teamId')
        if not team_id or not isinstance(team_id, int):
            return jsonify({"success": False, "error": "Valid team ID is required"}), 400
        
        # Check if region exists
        cursor.execute("SELECT regionId FROM regions WHERE regionId = %s", (region_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Region not found"}), 404
        
        # Check if team exists
        cursor.execute("SELECT teamId, name FROM teams WHERE teamId = %s", (team_id,))
        team = cursor.fetchone()
        if not team:
            return jsonify({"success": False, "error": "Team not found"}), 404
        
        # Update team's region assignment
        cursor.execute("UPDATE teams SET region_id = %s WHERE teamId = %s", 
                      (region_id, team_id))
        
        conn.commit()
        
        return jsonify({
            "success": True, 
            "message": f"Team '{team['name']}' assigned to region successfully"
        }), 200
        
    except Error as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Unexpected error: {str(e)}"}), 500