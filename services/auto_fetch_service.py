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
                        tag = d.split('\t')[0]
                        if tag == 'adv':
                            pos = "부사"
                            break
                        elif tag == 'adj':
                            pos = "형용사"
                            break
                        elif tag == 'n':
                            pos = "명사"
                            break
                        elif tag == 'v':
                            pos = "동사"
                            break
                        elif tag in ['prep', 'preposition']:
                            pos = "전치사"
                            break
                        elif tag in ['conj', 'conjunction']:
                            pos = "접속사"
                            break

                    if not meaning and defs:
                        meaning = defs[0].split('\t')[-1].strip()
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
            if pos == "형용사":
                example_en = f"The manager confirmed that the new policy is {word} for all department staff."
            elif pos == "부사":
                example_en = f"The team responded {word} to the customer's inquiry regarding the order."
            elif pos == "명사":
                example_en = f"All employees must strictly follow the safety {word} during operation."
            elif pos == "동사":
                example_en = f"The board members will {word} the proposed contract terms next week."
            else:
                example_en = f"Please refer to the guidelines regarding {word} for further details."

        # 4. Generate TOEIC Collocation & Trap Point by POS
        if pos == "형용사":
            collocation = f"be {word} for/to; {word} + Noun"
            trap_point = "be동사/연결동사 뒤 보어 자리 또는 명사 앞 수식 자리 확인"
        elif pos == "부사":
            collocation = f"{word} + Verb/Adjective; respond {word}"
            trap_point = "동사/형용사/문장전체 수식 자리 및 -ly 철자 형태 확인"
        elif pos == "명사":
            collocation = f"{word} for/to; Noun + {word}"
            trap_point = "가산/불가산 구분 및 동사/전치사 뒤 목적어 자리 확인"
        elif pos == "동사":
            collocation = f"{word} + Object; {word} with/in"
            trap_point = "자동사/타동사 구분 및 수일치/시제 판단 유의"
        elif pos == "전치사":
            collocation = f"{word} + Noun/Noun Phrase"
            trap_point = "전치사 뒤 명사/동명사 목적어 자리 (동사/절 접속 불발)"
        elif pos == "접속사":
            collocation = f"{word} + Subject + Verb"
            trap_point = "접속사 뒤 완전한 절(주어+동사) 이끄는 구조 확인"
        else:
            collocation = f"{word} + usage"
            trap_point = "문맥 어휘 및 품사 수식 관계 유의"

        # 5. Translate Example Sentence to Korean
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
            'collocation': collocation,
            'trap_point': trap_point,
            'example_en': example_en,
            'example_ko': example_ko or "예문 해석"
        }
