from functools import wraps
from flask import request, jsonify
import jwt
from config import Config

def verify_jwt_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.InvalidTokenError as e:
        raise Exception(f"Invalid token: {str(e)}")

def require_auth(f):
    """Decorator to require authentication for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Get token from cookie
            token = request.cookies.get('auth_token')
            
            # Debug logging (remove in production)
            print(f"[DEBUG] Token from cookie: {token[:20] + '...' if token else 'None'}", flush=True)
            print(f"[DEBUG] All cookies: {request.cookies}", flush=True)
            
            if not token:
                return jsonify({"success": False, "error": "Authentication required - no token"}), 401
            
            # Verify token
            payload = verify_jwt_token(token)
            
            # Add user info to request context
            request.user_id = payload['user_id']
            request.user_type = payload['user_type']
            
            print(f"[DEBUG] Auth successful - User ID: {request.user_id}, Type: {request.user_type}", flush=True)
            
            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"[DEBUG] Auth failed: {str(e)}", flush=True)
            return jsonify({"success": False, "error": f"Authentication failed: {str(e)}"}), 401
    
    return decorated_function

def require_dispatcher(f):
    """Decorator to require dispatcher role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            token = request.cookies.get('auth_token')
            
            if not token:
                return jsonify({"success": False, "error": "Authentication required"}), 401
            
            payload = verify_jwt_token(token)
            
            if payload['user_type'] != 'dispatcher':
                return jsonify({"success": False, "error": "Dispatcher access required"}), 403
            
            request.user_id = payload['user_id']
            request.user_type = payload['user_type']
            
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 401
    
    return decorated_function

def require_agent(f):
    """Decorator to require agent role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            token = request.cookies.get('auth_token')
            
            if not token:
                return jsonify({"success": False, "error": "Authentication required"}), 401
            
            payload = verify_jwt_token(token)
            
            if payload['user_type'] != 'agent':
                return jsonify({"success": False, "error": "Agent access required"}), 403
            
            request.user_id = payload['user_id']
            request.user_type = payload['user_type']
            
            return f(*args, **kwargs)
            
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 401
    
    return decorated_function