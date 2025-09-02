from flask import Flask
from flask_cors import CORS
from routes.booking import booking_bp
from routes.agent import agent_bp
from routes.disposition import disposition_bp
from routes.search import search_bp
from routes.auth import auth_bp
from config import Config
from extensions import mail

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Register blueprints
    app.register_blueprint(booking_bp)
    app.register_blueprint(agent_bp)
    app.register_blueprint(disposition_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(auth_bp)
    
    app.config["MAIL_SERVER"] = Config.MAIL_SERVER
    app.config["MAIL_PORT"] = Config.MAIL_PORT
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USERNAME"] = Config.MAIL_USERNAME
    app.config["MAIL_PASSWORD"] = Config.MAIL_PASSWORD
    app.config["MAIL_DEFAULT_SENDER"] = Config.MAIL_DEFAULT_SENDER

    mail.init_app(app)
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0")
