import urllib.request
import urllib.parse
import json
import re

# Comprehensive TOEIC Collocation Map for Adjectives, Adverbs, Verbs, Nouns
TOEIC_COLLOCATIONS = {
    'disappointed': 'be disappointed with / in / at / by; be disappointed to-v',
    'satisfied': 'be satisfied with',
    'pleased': 'be pleased with / to-v',
    'eligible': 'be eligible for / to-v',
    'responsible': 'be responsible for',
    'compatible': 'be compatible with',
    'aware': 'be aware of / that절',
    'concerned': 'be concerned about / with',
    'accustomed': 'be accustomed to + N/ing',
    'subject': 'be subject to + N/ing',
    'familiar': 'be familiar with / to',
    'equipped': 'be equipped with',
    'associated': 'be associated with',
    'consistent': 'be consistent with',
    'capable': 'be capable of + -ing',
    'suited': 'be suited for',
    'available': 'be available for / to',
    'equivalent': 'be equivalent to',
    'essential': 'be essential for / to',
    'vital': 'be vital to / for',
    'optimistic': 'be optimistic about',
    'reluctant': 'be reluctant to-v',
    'hesitant': 'be hesitant to-v',
    'vulnerable': 'be vulnerable to',
    'comparable': 'be comparable to / with',
    'integral': 'be integral to',
    'unanimous': 'be unanimous in',
    'reluctant': 'be reluctant to-v',
    'prohibited': 'be prohibited from + -ing',
    'exempt': 'be exempt from',
    'critical': 'be critical of / to',
    'responsive': 'be responsive to',
    'subsequent': 'subsequent to + N',
    'prior': 'prior to + N',
    'preceding': 'preceding + N',
    'convenient': 'be convenient for / to',
}

class AutoFetchService:
    @classmethod
    def fetch_word_details(cls, word):
        word_lower = word.strip().lower()
        if not word_lower:
            return None

        meaning = ""
        example_en = ""
        example_ko = ""
        pos = "형용사"

        # 1. Fetch Meaning via MyMemory Translation API
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(word_lower)}&langpair=en|ko"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                translated = data.get('responseData', {}).get('translatedText', '')
                if translated and translated.lower() != word_lower:
                    meaning = translated
        except Exception as e:
            print(f"[AutoFetch] MyMemory error: {e}")

        # 2. Fetch Example Sentence & Part-of-Speech via Datamuse API
        try:
            url = f"https://api.datamuse.com/words?sp={urllib.parse.quote(word_lower)}&md=dp"
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
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word_lower)}"
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
            if word_lower == 'disappointed':
                example_en = "The board members were disappointed with the quarterly financial results."
            elif pos == "형용사":
                example_en = f"The manager confirmed that the new policy is {word_lower} for all department staff."
            elif pos == "부사":
                example_en = f"The team responded {word_lower} to the customer's inquiry regarding the order."
            elif pos == "명사":
                example_en = f"All employees must strictly follow the safety {word_lower} during operation."
            elif pos == "동사":
                example_en = f"The board members will {word_lower} the proposed contract terms next week."
            else:
                example_en = f"Please refer to the guidelines regarding {word_lower} for further details."

        # 4. Refine Korean Meaning for Adjectives (e.g., '실망' -> '실망한, 실망스러운')
        if pos == "형용사":
            if meaning == "실망":
                meaning = "실망한, 실망스러운"
            elif meaning.endswith("함"):
                meaning = meaning[:-1] + "한"

        # 5. Extract Accurate TOEIC Collocation & Trap Point
        if word_lower in TOEIC_COLLOCATIONS:
            collocation = TOEIC_COLLOCATIONS[word_lower]
        else:
            # Dynamic Preposition Extraction from Example Sentence
            prep_match = re.search(r'\b(' + re.escape(word_lower) + r')\s+(with|in|at|by|for|to|about|of|on|from)\b', example_en, re.IGNORECASE)
            if prep_match:
                extracted_prep = prep_match.group(2).lower()
                collocation = f"be {word_lower} {extracted_prep}; {word_lower} + Noun"
            elif pos == "형용사":
                collocation = f"be {word_lower} for/to; {word_lower} + Noun"
            elif pos == "부사":
                collocation = f"{word_lower} + Verb/Adjective; respond {word_lower}"
            elif pos == "명사":
                collocation = f"{word_lower} for/to; Noun + {word_lower}"
            elif pos == "동사":
                collocation = f"{word_lower} + Object; {word_lower} with/in"
            elif pos == "전치사":
                collocation = f"{word_lower} + Noun/Noun Phrase"
            elif pos == "접속사":
                collocation = f"{word_lower} + Subject + Verb"
            else:
                collocation = f"{word_lower} + usage"

        # Set Trap Point by POS and Preposition
        if "with" in collocation:
            trap_point = f"전치사 with와 짝을 이루는 구문 (be {word_lower} with + N/NP)"
        elif "for" in collocation:
            trap_point = f"전치사 for와 결합하거나 명사 앞 수식 자리 위치 유의"
        elif pos == "형용사":
            trap_point = "be동사/연결동사 뒤 보어 자리 또는 명사 앞 수식 자리 확인"
        elif pos == "부사":
            trap_point = "동사/형용사/문장전체 수식 자리 및 -ly 철자 형태 확인"
        elif pos == "명사":
            trap_point = "가산/불가산 구분 및 동사/전치사 뒤 목적어 자리 확인"
        elif pos == "동사":
            trap_point = "자동사/타동사 구분 및 수일치/시제 판단 유의"
        else:
            trap_point = "문맥 어휘 및 품사 수식 관계 유의"

        # 6. Translate Example Sentence to Korean
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(example_en)}&langpair=en|ko"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                example_ko = data.get('responseData', {}).get('translatedText', '')
        except Exception as e:
            print(f"[AutoFetch] Example translate error: {e}")

        return {
            'word': word_lower,
            'pos': pos,
            'meaning': meaning or "의미 정보",
            'priority': "A",
            'topic': "일반 업무",
            'collocation': collocation,
            'trap_point': trap_point,
            'example_en': example_en,
            'example_ko': example_ko or "예문 해석"
        }
