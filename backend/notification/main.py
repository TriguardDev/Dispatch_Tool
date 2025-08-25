from flask import Flask, jsonify
import mysql.connector
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route("/notification", methods=["POST"])
def login():
  return {"call": "success"}, 200

if __name__ == "__main__":
    app.run(debug=True)