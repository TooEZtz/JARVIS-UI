import os
from flask import Flask, request, Response, jsonify
import requests
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://127.0.0.1:5500", "http://localhost:5500"]}})

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "N2lVS1w4EtoT3dr4eOWO"  # Callum's voice (alternate ID)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Add your Gemini API key to .env

def ask_gemini(user_sentence):
    # You will write your own prompt here
    prompt = f"The user said: {user_sentence}\n[Imagine you are Jarvis, the AI assistant from Iron Man. You are a helpful assistant that can answer questions and help with tasks. the sentence ahead is the user's sentence. you will answer the user's sentence in a way that is helpful and informative. you will also use the tone and personality of Jarvis from Iron Man. the backend is going to do whatever the user wants. you are the voice. you will say like opening this and doing this... in this manner avoid using charecters in your sentences becaue whatever you send will be used in backend to TTS. and dont speak too much just answer in short sentences. only what is required to be said]"
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": GEMINI_API_KEY}
    data = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    r = requests.post(url, headers=headers, params=params, json=data)
    if r.status_code != 200:
        return None
    gemini_response = r.json()
    # Extract the text from Gemini's response
    try:
        return gemini_response['candidates'][0]['content']['parts'][0]['text']
    except Exception:
        return None

def synthesize_speech(text):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5},
        "output_format": "mp3_44100_128"
    }
    r = requests.post(url, headers=headers, json=payload, stream=True)
    if r.status_code != 200:
        return None
    return r

@app.route('/api/ask-gemini', methods=['POST'])
def ask_gemini_route():
    data = request.get_json()
    user_sentence = data.get('text', '')
    if not user_sentence:
        return {"error": "No text provided"}, 400

    # 1. Get Gemini's response
    gemini_text = ask_gemini(user_sentence)
    if not gemini_text:
        return {"error": "Gemini API error"}, 500

    # 2. Synthesize Gemini's response
    tts_response = synthesize_speech(gemini_text)
    if not tts_response:
        return {"error": "TTS error"}, 500

    # 3. Return audio to frontend
    return Response(tts_response.iter_content(chunk_size=4096), content_type="audio/mpeg")

@app.route('/api/user-text', methods=['POST'])
def user_text():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return {"error": "No text provided"}, 400
    
    return {"status": "received"}, 200

@app.route('/api/tts', methods=['POST'])
def tts_route():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return {"error": "No text provided"}, 400

    tts_response = synthesize_speech(text)
    if not tts_response:
        return {"error": "TTS error"}, 500

    return Response(tts_response.iter_content(chunk_size=4096), content_type="audio/mpeg")

if __name__ == '__main__':
    app.run(port=5000, debug=True)
