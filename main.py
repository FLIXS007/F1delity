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
        print(f"Erreur lors de la récupération des sessions : {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/drivers/<session_key>')
def get_drivers(session_key):
    try:
        api_url = f"{OPENF1_API_URL}/drivers?session_key={session_key}"
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la récupération des pilotes : {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/teams')
def get_teams():
    try:
        meeting_key = request.args.get('meeting_key')
        if not meeting_key:
            return jsonify({"error": "Paramètre 'meeting_key' manquant"}), 400
            
        api_url = f"{OPENF1_API_URL}/teams?meeting_key={meeting_key}"
        print(f"Appel API Teams : {api_url}")
        response = requests.get(api_url, timeout=30)
        
        # --- CORRECTION ICI : Gérer le 404 spécifiquement ---
        if response.status_code == 404:
            print(f"L'API OpenF1 a renvoyé 404 pour les équipes du meeting {meeting_key}. Retourne une liste vide.")
            return jsonify([]) # Retourne une liste vide si 404
        
        response.raise_for_status() # Lève une exception pour les autres erreurs (4xx, 5xx)
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'appel à l'API OpenF1 pour les équipes : {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/location/<session_key>')
def get_location(session_key):
    try:
        driver_number = request.args.get('driver_number')
        
        api_url = f"{OPENF1_API_URL}/location?session_key={session_key}"
        if driver_number:
            api_url += f"&driver_number={driver_number}"
        
        response = requests.get(api_url, timeout=60)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'appel à l'API OpenF1 pour la localisation : {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
