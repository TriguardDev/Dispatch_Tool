from flask import Flask
from flask_cors import CORS
from routes.booking import booking_bp
from routes.agent import agent_bp
from routes.disposition import disposition_bp
from routes.search import search_bp
from routes.auth import auth_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Register blueprints
    app.register_blueprint(booking_bp)
    app.register_blueprint(agent_bp)
    app.register_blueprint(disposition_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(auth_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0")
