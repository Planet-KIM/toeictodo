import sqlite3
import json
import unicodedata
from datetime import datetime, timedelta
from config import Config
from services.excel_service import ExcelService

def norm(text):
    if not text:
        return ''
    return unicodedata.normalize('NFC', str(text)).strip()

class DbService:
    @classmethod
    def get_connection(cls):
        conn = sqlite3.connect(Config.DB_FILE)
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def init_db(cls):
        conn = cls.get_connection()
        cursor = conn.cursor()

        # 1. Base Tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS words (
                id TEXT PRIMARY KEY,
                word_no INTEGER,
                pos TEXT,
                word TEXT,
                meaning TEXT,
                priority TEXT,
                topic TEXT,
                collocation TEXT,
                trap_point TEXT,
                example_en TEXT,
                example_ko TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pairs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adj_word TEXT,
                adj_meaning TEXT,
                adv_word TEXT,
                adv_meaning TEXT,
                priority TEXT,
                point TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS traps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                example TEXT,
                guide TEXT
            )
        ''')

        # 2. User & Progress Scoped Tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id INTEGER,
                word_id TEXT,
                is_memorized INTEGER DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                last_reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, word_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_quiz_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                quiz_type TEXT,
                score INTEGER,
                total_questions INTEGER,
                wrong_word_ids TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.commit()

        # Seed Default User if empty
        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            cursor.execute('INSERT INTO users (name) VALUES (?)', ('학습자 1',))
            conn.commit()

        # Check if words table is empty. If empty, seed data from Excel!
        cursor.execute('SELECT COUNT(*) FROM words')
        count = cursor.fetchone()[0]

        if count == 0:
            print("[DbService] Initializing database from Excel file...")
            excel_data = ExcelService.get_data()
            
            words = excel_data.get('words', [])
            pairs = excel_data.get('pairs', [])
            traps = excel_data.get('traps', [])

            for w in words:
                cursor.execute('''
                    INSERT OR REPLACE INTO words 
                    (id, word_no, pos, word, meaning, priority, topic, collocation, trap_point, example_en, example_ko)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    norm(w['id']),
                    int(w.get('no', 0)),
                    norm(w['pos']),
                    norm(w['word']),
                    norm(w['meaning']),
                    norm(w['priority']),
                    norm(w['topic']),
                    norm(w['collocation']),
                    norm(w['trap_point']),
                    norm(w['example_en']),
                    norm(w['example_ko'])
                ))

            for p in pairs:
                cursor.execute('''
                    INSERT INTO pairs (adj_word, adj_meaning, adv_word, adv_meaning, priority, point)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    norm(p['adj_word']),
                    norm(p['adj_meaning']),
                    norm(p['adv_word']),
                    norm(p['adv_meaning']),
                    norm(p['priority']),
                    norm(p['point'])
                ))

            for t in traps:
                cursor.execute('''
                    INSERT INTO traps (type, example, guide)
                    VALUES (?, ?, ?)
                ''', (
                    norm(t['type']),
                    norm(t['example']),
                    norm(t['guide'])
                ))

            conn.commit()
            print(f"[DbService] Successfully seeded {len(words)} words, {len(pairs)} pairs, {len(traps)} traps into SQLite DB.")

        conn.close()

    @classmethod
    def get_words(cls):
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM words ORDER BY pos DESC, word_no ASC')
        rows = cursor.fetchall()
        conn.close()

        words = []
        for r in rows:
            words.append({
                'id': norm(r['id']),
                'no': r['word_no'],
                'pos': norm(r['pos']),
                'word': norm(r['word']),
                'meaning': norm(r['meaning']),
                'priority': norm(r['priority']),
                'topic': norm(r['topic']),
                'collocation': norm(r['collocation']),
                'trap_point': norm(r['trap_point']),
                'example_en': norm(r['example_en']),
                'example_ko': norm(r['example_ko'])
            })
        return words

    @classmethod
    def add_word(cls, word_data):
        conn = cls.get_connection()
        cursor = conn.cursor()

        pos = norm(word_data.get('pos', '형용사'))
        word = norm(word_data.get('word'))
        meaning = norm(word_data.get('meaning'))
        priority = norm(word_data.get('priority', 'A'))
        topic = norm(word_data.get('topic', '일반 업무'))
        collocation = norm(word_data.get('collocation', ''))
        trap_point = norm(word_data.get('trap_point', ''))
        example_en = norm(word_data.get('example_en', ''))
        example_ko = norm(word_data.get('example_ko', ''))

        cursor.execute('SELECT MAX(word_no) FROM words WHERE pos = ?', (pos,))
        max_no = cursor.fetchone()[0] or 0
        new_no = max_no + 1
        word_id = f"{pos}_{new_no}"

        cursor.execute('''
            INSERT INTO words 
            (id, word_no, pos, word, meaning, priority, topic, collocation, trap_point, example_en, example_ko)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (word_id, new_no, pos, word, meaning, priority, topic, collocation, trap_point, example_en, example_ko))

        conn.commit()
        conn.close()

        return {
            'id': word_id,
            'no': new_no,
            'pos': pos,
            'word': word,
            'meaning': meaning,
            'priority': priority,
            'topic': topic,
            'collocation': collocation,
            'trap_point': trap_point,
            'example_en': example_en,
            'example_ko': example_ko
        }

    @classmethod
    def update_word(cls, word_id, word_data):
        conn = cls.get_connection()
        cursor = conn.cursor()

        pos = norm(word_data.get('pos', '형용사'))
        word = norm(word_data.get('word'))
        meaning = norm(word_data.get('meaning'))
        priority = norm(word_data.get('priority', 'A'))
        topic = norm(word_data.get('topic', '일반 업무'))
        collocation = norm(word_data.get('collocation', ''))
        trap_point = norm(word_data.get('trap_point', ''))
        example_en = norm(word_data.get('example_en', ''))
        example_ko = norm(word_data.get('example_ko', ''))

        cursor.execute('''
            UPDATE words SET
                pos = ?, word = ?, meaning = ?, priority = ?, topic = ?,
                collocation = ?, trap_point = ?, example_en = ?, example_ko = ?
            WHERE id = ?
        ''', (pos, word, meaning, priority, topic, collocation, trap_point, example_en, example_ko, word_id))

        conn.commit()
        conn.close()

        return {
            'id': word_id,
            'pos': pos,
            'word': word,
            'meaning': meaning,
            'priority': priority,
            'topic': topic,
            'collocation': collocation,
            'trap_point': trap_point,
            'example_en': example_en,
            'example_ko': example_ko
        }

    @classmethod
    def delete_word(cls, word_id):
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM words WHERE id = ?', (word_id,))
        cursor.execute('DELETE FROM user_progress WHERE word_id = ?', (word_id,))
        conn.commit()
        conn.close()
        return True

    @classmethod
    def get_pairs(cls):
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM pairs ORDER BY id ASC')
        rows = cursor.fetchall()
        conn.close()

        pairs = []
        for r in rows:
            pairs.append({
                'id': r['id'],
                'adj_word': norm(r['adj_word']),
                'adj_meaning': norm(r['adj_meaning']),
                'adv_word': norm(r['adv_word']),
                'adv_meaning': norm(r['adv_meaning']),
                'priority': norm(r['priority']),
                'point': norm(r['point'])
            })
        return pairs

    @classmethod
    def get_traps(cls):
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM traps ORDER BY id ASC')
        rows = cursor.fetchall()
        conn.close()

        traps = []
        for r in rows:
            traps.append({
                'id': r['id'],
                'type': norm(r['type']),
                'example': norm(r['example']),
                'guide': norm(r['guide'])
            })
        return traps

    @classmethod
    def get_users(cls):
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users ORDER BY id ASC')
        rows = cursor.fetchall()
        conn.close()
        return [{'id': r['id'], 'name': r['name']} for r in rows]

    @classmethod
    def create_user(cls, name):
        name = norm(name)
        if not name:
            raise ValueError("User name cannot be empty")
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (name) VALUES (?)', (name,))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {'id': user_id, 'name': name}

    @classmethod
    def get_user_progress(cls, user_id):
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT word_id, is_memorized, review_count FROM user_progress WHERE user_id = ?', (user_id,))
        rows = cursor.fetchall()
        conn.close()

        memorized_ids = [r['word_id'] for r in rows if r['is_memorized'] == 1]
        review_counts = {r['word_id']: r['review_count'] for r in rows if r['review_count'] > 0}

        return {
            'user_id': user_id,
            'memorized_ids': memorized_ids,
            'review_counts': review_counts
        }

    @classmethod
    def get_user_streak_and_activity(cls, user_id):
        """Phase 3: Calculate 7-day study activity chart & consecutive streak with exception fallback"""
        conn = cls.get_connection()
        cursor = conn.cursor()

        # Fetch last 14 days activity
        cursor.execute('''
            SELECT DATE(last_reviewed_at) as log_date, COUNT(*) as cnt
            FROM user_progress
            WHERE user_id = ? AND last_reviewed_at IS NOT NULL
            GROUP BY DATE(last_reviewed_at)
            ORDER BY DATE(last_reviewed_at) DESC
        ''', (user_id,))
        rows = cursor.fetchall()
        conn.close()

        activity_map = {r['log_date']: r['cnt'] for r in rows if r['log_date']}

        # Calculate Last 7 Days (Mon~Sun or last 7 days)
        chart_data = []
        today = datetime.now().date()
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.strftime('%Y-%m-%d')
            day_label = d.strftime('%m/%d')
            cnt = activity_map.get(d_str, 0)
            chart_data.append({
                'date': d_str,
                'label': day_label,
                'count': cnt
            })

        # Calculate Consecutive Streak
        streak = 0
        curr_check = today
        while True:
            d_str = curr_check.strftime('%Y-%m-%d')
            if activity_map.get(d_str, 0) > 0:
                streak += 1
                curr_check -= timedelta(days=1)
            else:
                # Allow 1-day grace period if today hasn't been logged yet
                if curr_check == today:
                    curr_check -= timedelta(days=1)
                    continue
                break

        return {
            'streak_days': streak,
            'chart_data': chart_data
        }

    @classmethod
    def save_user_progress(cls, user_id, word_id, is_memorized, toggle=True):
        conn = cls.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT is_memorized, review_count FROM user_progress WHERE user_id = ? AND word_id = ?', (user_id, word_id))
        row = cursor.fetchone()

        new_mem = 1 if is_memorized else 0
        new_rev = (row['review_count'] + 1) if (row and toggle) else (row['review_count'] if row else 1)

        cursor.execute('''
            INSERT INTO user_progress (user_id, word_id, is_memorized, review_count, last_reviewed_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, word_id) DO UPDATE SET
                is_memorized = excluded.is_memorized,
                review_count = excluded.review_count,
                last_reviewed_at = CURRENT_TIMESTAMP
        ''', (user_id, word_id, new_mem, new_rev))

        conn.commit()
        conn.close()
        return {'user_id': user_id, 'word_id': word_id, 'is_memorized': new_mem, 'review_count': new_rev}

    @classmethod
    def save_quiz_result(cls, user_id, quiz_type, score, total, wrong_word_ids):
        conn = cls.get_connection()
        cursor = conn.cursor()
        wrong_json = json.dumps(wrong_word_ids or [])

        cursor.execute('''
            INSERT INTO user_quiz_logs (user_id, quiz_type, score, total_questions, wrong_word_ids)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, quiz_type, score, total, wrong_json))

        conn.commit()
        conn.close()
        return True

    @classmethod
    def get_user_wrong_words(cls, user_id):
        conn = cls.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT wrong_word_ids FROM user_quiz_logs WHERE user_id = ? AND wrong_word_ids IS NOT NULL ORDER BY id DESC', (user_id,))
        rows = cursor.fetchall()
        conn.close()

        wrong_ids_set = set()
        for r in rows:
            try:
                ids = json.loads(r['wrong_word_ids'])
                wrong_ids_set.update(ids)
            except Exception:
                pass

        all_words = cls.get_words()
        wrong_words = [w for w in all_words if w['id'] in wrong_ids_set]
        return wrong_words
