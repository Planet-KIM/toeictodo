import urllib.request
import urllib.parse
import json

class AutoFetchService:
    @classmethod
    def fetch_word_details(cls, word):
        word = word.strip()
        if not word:
            return None

        meaning = ""
        example_en = ""
        example_ko = ""
        pos = "형용사"

        # 1. Fetch Meaning via MyMemory Translation API
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(word)}&langpair=en|ko"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                translated = data.get('responseData', {}).get('translatedText', '')
                if translated and translated.lower() != word.lower():
                    meaning = translated
        except Exception as e:
            print(f"[AutoFetch] MyMemory error: {e}")

        # 2. Fetch Example Sentence & Part-of-Speech via Datamuse API
        try:
            url = f"https://api.datamuse.com/words?sp={urllib.parse.quote(word)}&md=dp"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                if data:
                    item = data[0]
                    defs = item.get('defs', [])
                    for d in defs:
                        if d.startswith('adv'):
                            pos = "부사"
                            break
                        elif d.startswith('adj'):
                            pos = "형용사"
                            break

                    # Fallback definition text if MyMemory is empty
                    if not meaning and defs:
                        meaning = defs[0].split('\t')[-1]
        except Exception as e:
            print(f"[AutoFetch] Datamuse error: {e}")

        # 3. Fetch Real Example Sentence via FreeDictionary API
        try:
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                if data and isinstance(data, list):
                    for m in data[0].get('meanings', []):
                        for defn in m.get('definitions', []):
                            if defn.get('example'):
                                example_en = defn.get('example')
                                break
                        if example_en:
                            break
        except Exception as e:
            print(f"[AutoFetch] FreeDict error: {e}")

        # Fallback Example Sentence if DictionaryAPI has no example
        if not example_en:
            example_en = f"The manager emphasized that the new policy is {word} for all department members."

        # 4. Translate Example Sentence to Korean
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(example_en)}&langpair=en|ko"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                example_ko = data.get('responseData', {}).get('translatedText', '')
        except Exception as e:
            print(f"[AutoFetch] Example translate error: {e}")

        return {
            'word': word,
            'pos': pos,
            'meaning': meaning or "의미 정보",
            'priority': "A",
            'topic': "일반 업무",
            'collocation': f"be {word} for/to",
            'trap_point': f"{pos} 자리 판별 및 문맥 어휘 문제 유의",
            'example_en': example_en,
            'example_ko': example_ko or "예문 해석"
        }
