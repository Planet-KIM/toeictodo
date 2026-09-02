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
    'prohibited': 'be prohibited from + -ing',
    'exempt': 'be exempt from',
    'critical': 'be critical of / to',
    'responsive': 'be responsive to',
    'subsequent': 'subsequent to + N',
    'prior': 'prior to + N',
    'preceding': 'preceding + N',
    'convenient': 'be convenient for / to',
}

TAG_MAP = {
    'adj': '형용사',
    'adjective': '형용사',
    'adv': '부사',
    'adverb': '부사',
    'n': '명사',
    'noun': '명사',
    'v': '동사',
    'verb': '동사',
    'prep': '전치사',
    'preposition': '전치사',
    'conj': '접속사',
    'conjunction': '접속사'
}

class AutoFetchService:
    _cache = {}  # In-Memory Cache to prevent rate limits & API delays

    @classmethod
    def fetch_word_details(cls, word):
        word_lower = word.strip().lower()
        if not word_lower:
            return None

        # Check In-Memory Cache first (0ms response)
        if word_lower in cls._cache:
            print(f"[AutoFetch Cache Hit] Returning cached details for '{word_lower}'")
            return cls._cache[word_lower]

        meaning = ""
        example_en = ""
        example_ko = ""
        found_pos_list = []
        meaning_options = []

        # 1. Fetch Meaning via MyMemory Translation API
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(word_lower)}&langpair=en|ko"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                translated = data.get('responseData', {}).get('translatedText', '')
                if translated and translated.lower() != word_lower:
                    meaning = translated
                    meaning_options.append(translated)
        except Exception as e:
            print(f"[AutoFetch] MyMemory error: {e}")

        # 2. Fetch Multi-POS & Definitions via Datamuse API
        try:
            url = f"https://api.datamuse.com/words?sp={urllib.parse.quote(word_lower)}&md=dp"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                if data:
                    item = data[0]
                    defs = item.get('defs', [])
                    for d in defs:
                        parts = d.split('\t')
                        tag = parts[0]
                        def_text = parts[-1].strip() if len(parts) > 1 else ''

                        if tag in TAG_MAP:
                            pos_kor = TAG_MAP[tag]
                            if pos_kor not in found_pos_list:
                                found_pos_list.append(pos_kor)

                        if def_text and def_text not in meaning_options:
                            meaning_options.append(def_text)

                    if not meaning and defs:
                        meaning = defs[0].split('\t')[-1].strip()
        except Exception as e:
            print(f"[AutoFetch] Datamuse error: {e}")

        # 3. Fetch Real Example Sentence & Additional POS via FreeDictionary API
        try:
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word_lower)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                if data and isinstance(data, list):
                    for m in data[0].get('meanings', []):
                        part = m.get('partOfSpeech', '')
                        if part in TAG_MAP:
                            pos_kor = TAG_MAP[part]
                            if pos_kor not in found_pos_list:
                                found_pos_list.append(pos_kor)

                        for defn in m.get('definitions', []):
                            if defn.get('example') and not example_en:
                                example_en = defn.get('example')

                            if defn.get('definition') and defn.get('definition') not in meaning_options:
                                meaning_options.append(defn.get('definition'))
        except Exception as e:
            print(f"[AutoFetch] FreeDict error: {e}")

        # Default POS fallback
        if not found_pos_list:
            found_pos_list = ["형용사"]

        pos_str = ", ".join(found_pos_list)

        # Fallback Example Sentence if DictionaryAPI has no example
        if not example_en:
            first_pos = found_pos_list[0]
            if word_lower == 'disappointed':
                example_en = "The board members were disappointed with the quarterly financial results."
            elif first_pos == "형용사":
                example_en = f"The manager confirmed that the new policy is {word_lower} for all department staff."
            elif first_pos == "부사":
                example_en = f"The team responded {word_lower} to the customer's inquiry regarding the order."
            elif first_pos == "명사":
                example_en = f"All employees must strictly follow the safety {word_lower} during operation."
            elif first_pos == "동사":
                example_en = f"The board members will {word_lower} the proposed contract terms next week."
            else:
                example_en = f"Please refer to the guidelines regarding {word_lower} for further details."

        # Refine Korean Meaning for Adjectives
        if "형용사" in found_pos_list:
            if meaning == "실망":
                meaning = "실망한, 실망스러운"
            elif meaning.endswith("함"):
                meaning = meaning[:-1] + "한"

        # Extract Accurate TOEIC Collocation & Trap Point
        if word_lower in TOEIC_COLLOCATIONS:
            collocation = TOEIC_COLLOCATIONS[word_lower]
        else:
            # Dynamic Preposition Extraction from Example Sentence
            prep_match = re.search(r'\b(' + re.escape(word_lower) + r')\s+(with|in|at|by|for|to|about|of|on|from)\b', example_en, re.IGNORECASE)
            first_pos = found_pos_list[0]
            if prep_match:
                extracted_prep = prep_match.group(2).lower()
                collocation = f"be {word_lower} {extracted_prep}; {word_lower} + Noun"
            elif first_pos == "형용사":
                collocation = f"be {word_lower} for/to; {word_lower} + Noun"
            elif first_pos == "부사":
                collocation = f"{word_lower} + Verb/Adjective; respond {word_lower}"
            elif first_pos == "명사":
                collocation = f"{word_lower} for/to; Noun + {word_lower}"
            elif first_pos == "동사":
                collocation = f"{word_lower} + Object; {word_lower} with/in"
            elif first_pos == "전치사":
                collocation = f"{word_lower} + Noun/Noun Phrase"
            elif first_pos == "접속사":
                collocation = f"{word_lower} + Subject + Verb"
            else:
                collocation = f"{word_lower} + usage"

        # Set Trap Point by POS and Preposition
        if "with" in collocation:
            trap_point = f"전치사 with와 짝을 이루는 구문 (be {word_lower} with + N/NP)"
        elif "for" in collocation:
            trap_point = f"전치사 for와 결합하거나 명사 앞 수식 자리 위치 유의"
        elif "형용사" in found_pos_list:
            trap_point = "be동사/연결동사 뒤 보어 자리 또는 명사 앞 수식 자리 확인"
        elif "부사" in found_pos_list:
            trap_point = "동사/형용사/문장전체 수식 자리 및 -ly 철자 형태 확인"
        elif "명사" in found_pos_list:
            trap_point = "가산/불가산 구분 및 동사/전치사 뒤 목적어 자리 확인"
        elif "동사" in found_pos_list:
            trap_point = "자동사/타동사 구분 및 수일치/시제 판단 유의"
        else:
            trap_point = "문맥 어휘 및 품사 수식 관계 유의"

        # Translate Example Sentence to Korean
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(example_en)}&langpair=en|ko"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode('utf-8'))
                example_ko = data.get('responseData', {}).get('translatedText', '')
        except Exception as e:
            print(f"[AutoFetch] Example translate error: {e}")

        res_data = {
            'word': word_lower,
            'pos': pos_str,
            'pos_list': found_pos_list,
            'meaning': meaning or "의미 정보",
            'meaning_options': meaning_options[:6],
            'priority': "A",
            'topic': "일반 업무",
            'collocation': collocation,
            'trap_point': trap_point,
            'example_en': example_en,
            'example_ko': example_ko or "예문 해석"
        }

        # Store in Server Cache
        cls._cache[word_lower] = res_data
        return res_data
