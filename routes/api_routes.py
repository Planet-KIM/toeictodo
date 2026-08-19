from flask import Blueprint, jsonify, request, Response
import urllib.request
import urllib.parse
from services.db_service import DbService

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/words', methods=['GET'])
def get_words():
    """Retrieve all vocabulary words from SQLite DB"""
    words = DbService.get_words()
    return jsonify(words)

@api_bp.route('/words', methods=['POST'])
def add_word():
    """Add a new word into SQLite DB"""
    data = request.get_json() or {}
    if not data.get('word') or not data.get('meaning'):
        return jsonify({'error': 'word and meaning are required'}), 400

    new_word = DbService.add_word(data)
    return jsonify({'success': True, 'word': new_word}), 201

@api_bp.route('/pairs', methods=['GET'])
def get_pairs():
    """Retrieve adjective-adverb word pairs from SQLite DB"""
    pairs = DbService.get_pairs()
    return jsonify(pairs)

@api_bp.route('/traps', methods=['GET'])
def get_traps():
    """Retrieve Part 5 trap questions from SQLite DB"""
    traps = DbService.get_traps()
    return jsonify(traps)

# --------------------------------------------------------------------------
# Multi-User Profile & Progress Scoped Endpoints
# --------------------------------------------------------------------------
@api_bp.route('/users', methods=['GET'])
def get_users():
    """Get list of registered user profiles"""
    users = DbService.get_users()
    return jsonify(users)

@api_bp.route('/users', methods=['POST'])
def create_user():
    """Create a new user profile"""
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'User name is required'}), 400
    try:
        user = DbService.create_user(name)
        return jsonify({'success': True, 'user': user}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api_bp.route('/users/<int:user_id>/progress', methods=['GET'])
def get_user_progress(user_id):
    """Get user-specific progress (memorized word IDs & review counts)"""
    progress = DbService.get_user_progress(user_id)
    return jsonify(progress)

@api_bp.route('/users/<int:user_id>/progress', methods=['POST'])
def save_user_progress(user_id):
    """Save word progress for specific user"""
    data = request.get_json() or {}
    word_id = data.get('word_id')
    is_memorized = data.get('is_memorized', False)
    toggle = data.get('toggle', True)

    if not word_id:
        return jsonify({'error': 'word_id is required'}), 400

    result = DbService.save_user_progress(user_id, word_id, is_memorized, toggle)
    return jsonify({'success': True, 'progress': result})

@api_bp.route('/users/<int:user_id>/quiz-results', methods=['POST'])
def save_quiz_result(user_id):
    """Log user quiz result and wrong answers for wrong-notebook"""
    data = request.get_json() or {}
    quiz_type = data.get('quiz_type', 'meaning')
    score = data.get('score', 0)
    total = data.get('total', 10)
    wrong_word_ids = data.get('wrong_word_ids', [])

    DbService.save_quiz_result(user_id, quiz_type, score, total, wrong_word_ids)
    return jsonify({'success': True})

@api_bp.route('/users/<int:user_id>/wrong-words', methods=['GET'])
def get_user_wrong_words(user_id):
    """Get list of words user got wrong in quizzes"""
    wrong_words = DbService.get_user_wrong_words(user_id)
    return jsonify(wrong_words)

@api_bp.route('/audio', methods=['GET'])
def get_audio_proxy():
    """
    Server-side audio proxy to fetch and stream Google TTS MP3 audio.
    Bypasses CORS restrictions and prevents fallback to browser TTS engine.
    """
    text = request.args.get('text', '').strip()
    accent = request.args.get('accent', 'en-us').strip()

    if not text:
        return jsonify({'error': 'Text parameter is required'}), 400

    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(text)}&tl={accent}&client=tw-ob"

    try:
        req = urllib.request.Request(
            tts_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            audio_data = response.read()
            return Response(audio_data, mimetype='audio/mpeg')
    except Exception as e:
        print(f"[Audio Proxy Error] {e}")
        return jsonify({'error': 'Failed to fetch audio stream'}), 500
