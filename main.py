from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

# URL de base de l'API OpenF1
OPENF1_API_URL = "https://api.openf1.org/v1"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/sessions')
def get_sessions():
    try:
        response = requests.get(f"{OPENF1_API_URL}/sessions")
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/drivers/<session_key>')
def get_drivers(session_key):
    # Point de terminaison pour obtenir la liste des pilotes d'une session
    try:
        api_url = f"{OPENF1_API_URL}/drivers?session_key={session_key}"
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/location/<session_key>')
def get_location(session_key):
    try:
        # On récupère le driver_number s'il est passé en paramètre (ex: /api/location/9161?driver_number=1)
        driver_number = request.args.get('driver_number')
        
        api_url = f"{OPENF1_API_URL}/location?session_key={session_key}"
        if driver_number:
            api_url += f"&driver_number={driver_number}"
        
        response = requests.get(api_url, timeout=60)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
