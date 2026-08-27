import os
import hashlib
import urllib.request
import urllib.parse
from config import Config

CACHE_DIR = os.path.join(Config.STATIC_DIR, 'audio_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

class AudioCacheService:
    @classmethod
    def get_cache_path(cls, text, accent):
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        filename = f"{accent}_{text_hash}.mp3"
        return os.path.join(CACHE_DIR, filename), filename

    @classmethod
    def get_or_fetch_audio(cls, text, accent):
        file_path, filename = cls.get_cache_path(text, accent)

        # 1. Return cached audio if file exists on disk
        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
            with open(file_path, 'rb') as f:
                return f.read(), f"/audio_cache/{filename}"

        # 2. Fetch from Google TTS API if not cached yet
        tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(text)}&tl={accent}&client=tw-ob"
        req = urllib.request.Request(
            tts_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        )

        with urllib.request.urlopen(req, timeout=8) as response:
            audio_data = response.read()

        # Save to local disk cache for 100% offline reuse
        try:
            with open(file_path, 'wb') as f:
                f.write(audio_data)
        except Exception as e:
            print(f"[AudioCache] Failed to save cache file: {e}")

        return audio_data, f"/audio_cache/{filename}"
