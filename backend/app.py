from flask import Flask, request
from flask_cors import CORS
from routes.booking import booking_bp
from routes.agent import agent_bp
from routes.disposition import disposition_bp
from routes.search import search_bp
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.dispatcher import dispatcher_bp
from routes.teams import teams_bp
from routes.timeoff import timeoff_bp
from routes.regions import regions_bp
from routes.timesheet import timesheet_bp
from config import Config
from extensions import mail
import logging

def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow credentials (cookies)
    CORS(app, 
         supports_credentials=True,  # Allow cookies to be sent
         origins=[
             "http://localhost:3000",    # React dev server
             "http://localhost:5173",    # Vite dev server
             "http://localhost:4173",    # Vite preview
             "https://app.salesdispatcher.com",  # Replace with your actual domain
             "https://appointment-form.thspros.com",       # Appointment form server
             "http://localhost:8080",    # Common dev server port
         ],
         allow_headers=["Content-Type", "Authorization", "X-API-Key"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Register blueprints
    app.register_blueprint(booking_bp)
    app.register_blueprint(agent_bp)
    app.register_blueprint(disposition_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(dispatcher_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(timeoff_bp)
    app.register_blueprint(regions_bp)
    app.register_blueprint(timesheet_bp)
    
    app.config["MAIL_SERVER"] = Config.MAIL_SERVER
    app.config["MAIL_PORT"] = Config.MAIL_PORT
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USERNAME"] = Config.MAIL_USERNAME
    app.config["MAIL_PASSWORD"] = Config.MAIL_PASSWORD
    app.config["MAIL_DEFAULT_SENDER"] = Config.MAIL_DEFAULT_SENDER

    mail.init_app(app)
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    app.logger.setLevel(logging.INFO)
    
    # Log all requests for debugging
    @app.before_request
    def log_request_info():
        app.logger.info('Request: %s %s', request.method, request.url)
        app.logger.info('Headers: %s', dict(request.headers))
    
    @app.after_request
    def log_response_info(response):
        app.logger.info('Response: %s', response.status_code)
        return response
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=8000)