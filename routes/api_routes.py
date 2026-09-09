from flask import Blueprint, jsonify, request, Response
import urllib.parse
import json
import io
from openpyxl import Workbook
from services.db_service import DbService
from services.audio_cache_service import AudioCacheService
from services.auto_fetch_service import AutoFetchService
from utils.logger import get_logger

logger = get_logger('toeictodo')
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
    logger.info(f"[API] Word registered: '{data.get('word')}' (ID: {new_word.get('id')})")
    return jsonify({'success': True, 'word': new_word}), 201

# --------------------------------------------------------------------------
# Phase 4: Excel & JSON Export / Backup & Import Endpoints
# --------------------------------------------------------------------------
@api_bp.route('/words/export/excel', methods=['GET'])
def export_words_excel():
    """Phase 4: Export vocabulary words as a downloadable Excel (.xlsx) file"""
    try:
        words = DbService.get_words()
        wb = Workbook()
        ws = wb.active
        ws.title = "TOEIC_Words"
        ws.append(["ID", "번호", "품사", "단어", "한글뜻", "우선순위", "토픽", "결합문형", "함정포인트", "영문예문", "예문해석"])

        for w in words:
            ws.append([
                w.get('id'), w.get('no'), w.get('pos'), w.get('word'),
                w.get('meaning'), w.get('priority'), w.get('topic'),
                w.get('collocation'), w.get('trap_point'),
                w.get('example_en'), w.get('example_ko')
            ])

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        logger.info(f"[API] Exported {len(words)} words to Excel file.")

        return Response(
            out.getvalue(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=TOEIC_550_Master_Export.xlsx"}
        )
    except Exception as e:
        logger.error(f"[API] Excel export error: {e}")
        return jsonify({'error': f"Excel export error: {str(e)}"}), 500

@api_bp.route('/words/export/json', methods=['GET'])
def export_words_json():
    """Phase 4: Export vocabulary database as JSON backup file"""
    try:
        words = DbService.get_words()
        users = DbService.get_users()
        backup_data = {
            'version': '1.0',
            'word_count': len(words),
            'words': words,
            'users': users
        }
        logger.info(f"[API] Exported JSON backup with {len(words)} words.")
        return Response(
            json.dumps(backup_data, ensure_ascii=False, indent=2),
            mimetype="application/json",
            headers={"Content-Disposition": "attachment; filename=TOEIC_Backup_Words.json"}
        )
    except Exception as e:
        logger.error(f"[API] JSON export error: {e}")
        return jsonify({'error': f"JSON export error: {str(e)}"}), 500

@api_bp.route('/words/import/json', methods=['POST'])
def import_words_json():
    """Phase 4: Restore/import vocabulary database from uploaded JSON backup file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if not file.filename.endswith('.json'):
            return jsonify({'error': 'File format must be .json'}), 400

        content = file.read().decode('utf-8')
        data = json.loads(content)
        words = data.get('words', [])

        if not words or not isinstance(words, list):
            return jsonify({'error': 'Invalid JSON backup format'}), 400

        restored_count = 0
        for w in words:
            if w.get('word') and w.get('meaning'):
                DbService.add_word(w)
                restored_count += 1

        logger.info(f"[API] Restored {restored_count} words from JSON backup file.")
        return jsonify({'success': True, 'restored_count': restored_count})
    except Exception as e:
        logger.error(f"[API] JSON import error: {e}")
        return jsonify({'error': f"JSON import error: {str(e)}"}), 500

# --------------------------------------------------------------------------
# Word Search / Auto-Fetch / Single Word Operations
# --------------------------------------------------------------------------
@api_bp.route('/words/auto-fetch', methods=['GET'])
def auto_fetch_word():
    """Auto-fetch word details and examples using AutoFetchService"""
    word = request.args.get('word', '').strip()
    if not word:
        return jsonify({'error': 'Word parameter is required'}), 400

    try:
        details = AutoFetchService.fetch_word_details(word)
        return jsonify({'success': True, 'data': details})
    except Exception as e:
        logger.error(f"[API] Auto-fetch error for '{word}': {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/words/<word_id>', methods=['GET'])
def get_word(word_id):
    """Retrieve a single word from SQLite DB"""
    words = DbService.get_words()
    word = next((w for w in words if str(w['id']) == str(word_id)), None)
    if not word:
        return jsonify({'error': 'Word not found'}), 404
    return jsonify(word)

@api_bp.route('/words/<word_id>', methods=['PUT'])
def update_word(word_id):
    """Update a word in SQLite DB"""
    data = request.get_json() or {}
    if not data.get('word') or not data.get('meaning'):
        return jsonify({'error': 'word and meaning are required'}), 400

    updated = DbService.update_word(word_id, data)
    logger.info(f"[API] Word updated ID {word_id}: '{data.get('word')}'")
    return jsonify({'success': True, 'word': updated})

@api_bp.route('/words/<word_id>', methods=['DELETE'])
def delete_word(word_id):
    """Delete a word from SQLite DB"""
    DbService.delete_word(word_id)
    logger.info(f"[API] Word deleted ID {word_id}")
    return jsonify({'success': True})

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
        logger.info(f"[API] New user registered: '{name}' (ID: {user['id']})")
        return jsonify({'success': True, 'user': user}), 201
    except Exception as e:
        logger.warning(f"[API] Create user failed for '{name}': {e}")
        return jsonify({'error': str(e)}), 400

@api_bp.route('/users/<int:user_id>/progress', methods=['GET'])
def get_user_progress(user_id):
    """Get user-specific progress (memorized word IDs & review counts)"""
    progress = DbService.get_user_progress(user_id)
    return jsonify(progress)

@api_bp.route('/users/<int:user_id>/activity', methods=['GET'])
def get_user_activity(user_id):
    """Phase 3: Get 7-day study activity chart & streak counter with exception handling"""
    try:
        data = DbService.get_user_streak_and_activity(user_id)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        logger.error(f"[API] Get activity error for user {user_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/users/<int:user_id>/progress', methods=['POST'])
def save_user_progress(user_id):
    """Save user word progress (memorized state & review increment)"""
    data = request.get_json() or {}
    word_id = data.get('word_id')
    is_memorized = data.get('is_memorized', False)
    toggle = data.get('toggle', False)

    if not word_id:
        return jsonify({'error': 'word_id is required'}), 400

    result = DbService.save_user_progress(user_id, word_id, is_memorized, toggle)
    return jsonify({'success': True, 'progress': result})

@api_bp.route('/users/<int:user_id>/progress/batch', methods=['POST'])
def save_user_progress_batch(user_id):
    """Batch sync user progress from offline queue"""
    data = request.get_json() or {}
    items = data.get('items', [])
    for item in items:
        word_id = item.get('word_id')
        is_memorized = item.get('is_memorized', False)
        if word_id:
            DbService.save_user_progress(user_id, word_id, is_memorized, toggle=False)
    logger.info(f"[API] Batch synced {len(items)} progress items for user {user_id}")
    return jsonify({'success': True, 'count': len(items)})

@api_bp.route('/users/<int:user_id>/quiz-results', methods=['POST'])
def save_quiz_result(user_id):
    """Log user quiz result and wrong answers for wrong-notebook"""
    data = request.get_json() or {}
    quiz_type = data.get('quiz_type', 'meaning')
    score = data.get('score', 0)
    total = data.get('total', 10)
    wrong_word_ids = data.get('wrong_word_ids', [])

    DbService.save_quiz_result(user_id, quiz_type, score, total, wrong_word_ids)
    logger.info(f"[API] Quiz result saved for user {user_id}: {score}/{total} ({quiz_type})")
    return jsonify({'success': True})

@api_bp.route('/users/<int:user_id>/wrong-words', methods=['GET'])
def get_user_wrong_words(user_id):
    """Get list of words user got wrong in quizzes"""
    wrong_words = DbService.get_user_wrong_words(user_id)
    return jsonify(wrong_words)

# --------------------------------------------------------------------------
# Audio Proxy & Bulk Preload List for Offline PWA
# --------------------------------------------------------------------------
@api_bp.route('/audio', methods=['GET'])
def get_audio_proxy():
    """
    Server-side audio proxy with disk caching.
    Streams MP3 audio and caches locally for 100% offline playback.
    """
    text = request.args.get('text', '').strip()
    accent = request.args.get('accent', 'en-us').strip()

    if not text:
        return jsonify({'error': 'Text parameter is required'}), 400

    try:
        audio_data, cache_relative_url = AudioCacheService.get_or_fetch_audio(text, accent)
        return Response(audio_data, mimetype='audio/mpeg')
    except Exception as e:
        logger.error(f"[Audio Proxy Error] text='{text}', accent='{accent}': {e}")
        return jsonify({'error': 'Failed to fetch audio stream'}), 500

@api_bp.route('/audio/preload-list', methods=['GET'])
def get_audio_preload_list():
    """
    Generates list of audio URLs for all 550 words across US, UK, AU accents
    and Korean prompts for bulk offline caching.
    """
    words = DbService.get_words()
    accents = ['en-us', 'en-gb', 'en-au']
    urls = []

    for idx, w in enumerate(words):
        num_text = f"{idx + 1}번"
        urls.append(f"/api/audio?text={urllib.parse.quote(num_text)}&accent=ko")

        for acc in accents:
            urls.append(f"/api/audio?text={urllib.parse.quote(w['word'])}&accent={acc}")

        ko_text = f"{w['meaning']}. {w['pos']}."
        urls.append(f"/api/audio?text={urllib.parse.quote(ko_text)}&accent=ko")

    return jsonify({'total': len(urls), 'urls': urls})
