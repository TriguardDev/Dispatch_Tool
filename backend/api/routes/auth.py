from flask import Blueprint, request, jsonify, make_response
from db import get_connection
import jwt
import bcrypt
from datetime import datetime, timedelta
from config import Config

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_jwt_token(user_id: int, user_type: str) -> str:
    """Generate a JWT token for a user"""
    payload = {
        'user_id': user_id,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(hours=24),  # Token expires in 24 hours
        'iat': datetime.utcnow()  # Issued at time
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')

def verify_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a dispatcher or agent using email/password.
    Returns JWT token in HTTP-only cookie.
    """
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"success": False, "error": "Missing email or password"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Check dispatchers first
        cursor.execute("SELECT dispatcherId, password FROM dispatchers WHERE email = %s", (email,))
        dispatcher = cursor.fetchone()
        
        if dispatcher and verify_password(password, dispatcher['password']):
            token = generate_jwt_token(dispatcher['dispatcherId'], 'dispatcher')
            response = make_response(jsonify({
                "success": True,
                "id": dispatcher['dispatcherId'],
                "user_type": "dispatcher"
            }))
            # Set HTTP-only cookie with JWT token
            response.set_cookie(
                'auth_token', 
                token,
                max_age=24*60*60,  # 24 hours
                httponly=True,     # Can't be accessed by JavaScript
                secure=False,       # Only sent over HTTPS
                samesite='Lax'     # CSRF protection
            )
            return response, 200

        # Check agents
        cursor.execute("SELECT agentId, password FROM field_agents WHERE email = %s", (email,))
        agent = cursor.fetchone()
        
        if agent and verify_password(password, agent['password']):
            token = generate_jwt_token(agent['agentId'], 'agent')
            response = make_response(jsonify({
                "success": True,
                "id": agent['agentId'],
                "user_type": "agent"
            }))
            response.set_cookie(
                'auth_token', 
                token,
                max_age=24*60*60,
                httponly=True,
                secure=False,
                samesite='Lax'
            )
            return response, 200

        return jsonify({"success": False, "error": "Invalid email or password"}), 401

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clear the authentication cookie"""
    response = make_response(jsonify({"success": True, "message": "Logged out successfully"}))
    response.set_cookie('auth_token', '', expires=0, httponly=True, secure=False, samesite='Lax')
    return response, 200

@auth_bp.route("/verify", methods=["GET"])
def verify_token():
    """Verify if the current token is valid"""
    try:
        token = request.cookies.get('auth_token')
        print(f"[DEBUG] Verify endpoint - token: {token[:20] + '...' if token else 'None'}", flush=True)
        print(f"[DEBUG] All cookies: {dict(request.cookies)}", flush=True)
        
        if not token:
            return jsonify({"success": False, "error": "No token provided"}), 401
        
        payload = verify_jwt_token(token)
        return jsonify({
            "success": True,
            "user_id": payload['user_id'],
            "user_type": payload['user_type']
        }), 200
    
    except Exception as e:
        print(f"[DEBUG] Token verification failed: {str(e)}", flush=True)
        return jsonify({"success": False, "error": str(e)}), 401

@auth_bp.route("/debug-cookies", methods=["GET"])
def debug_cookies():
    """Debug endpoint to check what cookies are being sent"""
    return jsonify({
        "cookies": dict(request.cookies),
        "headers": dict(request.headers)
    })

# Utility function to create hashed passwords for existing users
@auth_bp.route("/hash-existing-passwords", methods=["POST"])
def hash_existing_passwords():
    """
    One-time utility to hash existing plain text passwords.
    Remove this endpoint after running once in production!
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Hash dispatcher passwords
        cursor.execute("SELECT dispatcherId, password FROM dispatchers")
        dispatchers = cursor.fetchall()
        
        for dispatcher in dispatchers:
            if len(dispatcher['password']) < 50:  # Assume it's not hashed if less than 50 chars
                hashed_pwd = hash_password(dispatcher['password'])
                cursor.execute(
                    "UPDATE dispatchers SET password = %s WHERE dispatcherId = %s",
                    (hashed_pwd, dispatcher['dispatcherId'])
                )

        # Hash agent passwords
        cursor.execute("SELECT agentId, password FROM field_agents")
        agents = cursor.fetchall()
        
        for agent in agents:
            if len(agent['password']) < 50:  # Assume it's not hashed if less than 50 chars
                hashed_pwd = hash_password(agent['password'])
                cursor.execute(
                    "UPDATE field_agents SET password = %s WHERE agentId = %s",
                    (hashed_pwd, agent['agentId'])
                )

        conn.commit()
        return jsonify({"success": True, "message": "Passwords hashed successfully"}), 200

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()