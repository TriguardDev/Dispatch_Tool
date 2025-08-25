from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route("/notification", methods=["POST"])
def notify_users():
  zapier_endpoint = 'https://hooks.zapier.com/hooks/catch/24326421/ut0e6ah/'
  # send post request to endpoint with json payload
  try:
      data = request.get_json()
      print(data, flush=True)
      response = requests.post(zapier_endpoint, json=data)
      response.raise_for_status()
      return {"call": "success"}, 200
  except Exception as e:
      print(f"Failed to notify via Zapier: {e}")
      return {"call": "failed"}, 500
     
if __name__ == "__main__":
    app.run(debug=True)