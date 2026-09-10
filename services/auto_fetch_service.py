import urllib.request
import urllib.parse
import json
import re
from utils.logger import get_logger

logger = get_logger('toeictodo')

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

def is_korean_text(text):
    if not text:
        return False
    return bool(re.search(r'[\uac00-\ud7a3]', text))

class AutoFetchService:
    @classmethod
    def fetch_word_details(cls, word):
        word_lower = word.strip().lower()
        logger.info(f"[AutoFetch] Fetching word details for '{word_lower}'...")

        # 0. Check Local Database First for 100% Curated TOEIC Accuracy & Instant Response
        try:
            from services.db_service import DbService
            words = DbService.get_words()
            matched = next((w for w in words if w.get('word', '').strip().lower() == word_lower), None)
            if matched:
                logger.info(f"[AutoFetch] Found exact match in local DB for '{word_lower}'")
                raw_m = matched.get('meaning', '')
                meanings = [m.strip() for m in re.split(r'[,;/]', raw_m) if m.strip()]
                return {
                    'word': matched.get('word'),
                    'pos': matched.get('pos', '형용사'),
                    'meaning': raw_m,
                    'meaning_options': meanings,
                    'priority': matched.get('priority', 'A'),
                    'topic': matched.get('topic', '일반 업무'),
                    'collocation': matched.get('collocation', ''),
                    'trap_point': matched.get('trap_point', ''),
                    'example_en': matched.get('example_en', ''),
                    'example_ko': matched.get('example_ko', '')
                }
        except Exception as e:
            logger.warning(f"[AutoFetch] Local DB priority check error: {e}")

        meaning = ""
        example_en = ""
        example_ko = ""
        found_pos_list = []
        raw_meaning_options = []

        # 1. Fetch Meaning & Korean Meaning Options via MyMemory Translation API (2s timeout)
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(word_lower)}&langpair=en|ko"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=2) as r:
                data = json.loads(r.read().decode('utf-8'))
                translated = data.get('responseData', {}).get('translatedText', '')
                if translated and is_korean_text(translated) and translated.lower() != word_lower:
                    meaning = translated
                    for part in re.split(r'[,;/]', translated):
                        cleaned = part.strip()
                        if cleaned and cleaned not in raw_meaning_options:
                            raw_meaning_options.append(cleaned)
        except Exception as e:
            logger.warning(f"[AutoFetch] MyMemory translation error for '{word_lower}': {e}")

        # 2. Fetch Multi-POS & Definitions via Datamuse API (2s timeout)
        try:
            url = f"https://api.datamuse.com/words?sp={urllib.parse.quote(word_lower)}&md=dp"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=2) as r:
                data = json.loads(r.read().decode('utf-8'))
                if data:
                    item = data[0]
                    defs = item.get('defs', [])
                    for d in defs:
                        parts = d.split('\t')
                        tag = parts[0]
                        if tag in TAG_MAP:
                            pos_kor = TAG_MAP[tag]
                            if pos_kor not in found_pos_list:
                                found_pos_list.append(pos_kor)

                    if not meaning and defs:
                        meaning = defs[0].split('\t')[-1].strip()
        except Exception as e:
            logger.warning(f"[AutoFetch] Datamuse error for '{word_lower}': {e}")

        # 3. Fetch Real Example Sentence via FreeDictionary API (2s timeout)
        try:
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word_lower)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=2) as r:
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
        except Exception as e:
            logger.warning(f"[AutoFetch] FreeDict error for '{word_lower}': {e}")

        # Default POS fallback
        if not found_pos_list:
            found_pos_list = ["형용사"]

        pos_str = ", ".join(found_pos_list)

        # Fallback Example Sentence if DictionaryAPI has no example
        if not example_en:
            first_pos = found_pos_list[0]
            if "형용사" in first_pos:
                example_en = f"The new strategy proved to be highly {word_lower} in improving overall productivity."
                example_ko = f"새로운 전략은 전체적인 생산성을 향상시키는 데 매우 효과적인 것으로 입증되었습니다."
            elif "부사" in first_pos:
                example_en = f"The manager {word_lower} reviewed all pending budget proposals."
                example_ko = f"관리자는 대기 중인 모든 예산 안안을 검토했습니다."
            elif "전치사" in first_pos or "접속사" in first_pos:
                example_en = f"Please process the application {word_lower} the deadline expires."
                example_ko = f"마감 시한이 만료되기 전에 신청서를 처리해 주세요."
            else:
                example_en = f"The team presented a {word_lower} solution during the executive meeting."
                example_ko = f"팀은 임원 회의에서 해결책을 제시했습니다."

        # Translate Example Sentence to Korean if missing
        if example_en and not example_ko:
            try:
                url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(example_en)}&langpair=en|ko"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as r:
                    data = json.loads(r.read().decode('utf-8'))
                    translated = data.get('responseData', {}).get('translatedText', '')
                    if translated:
                        example_ko = translated
            except Exception as e:
                logger.warning(f"[AutoFetch] Example translation error for '{word_lower}': {e}")
                example_ko = "해당 예문의 한국어 해석을 확인해 주세요."

        # Fetch TOEIC Collocation from preset map
        collocation = TOEIC_COLLOCATIONS.get(word_lower, "")
        if not collocation:
            if "형용사" in pos_str:
                collocation = f"be {word_lower} for / to"
            elif "부사" in pos_str:
                collocation = f"{word_lower} + 동사/형용사 수식"
            elif "전치사" in pos_str:
                collocation = f"{word_lower} + N/ing"
            elif "접속사" in pos_str:
                collocation = f"{word_lower} + S+V"
            else:
                collocation = f"{word_lower} + N"

        trap_point = f"명사 앞 수식 또는 연결동사 뒤 {pos_str} 자리 구분"
        priority = 'A' if word_lower in TOEIC_COLLOCATIONS or len(word_lower) <= 7 else 'B'

        # Filter meaning_options to ONLY contain Korean text
        korean_meaning_options = [m for m in raw_meaning_options if is_korean_text(m)]

        logger.info(f"[AutoFetch] Successfully fetched details for '{word_lower}' (POS: {pos_str}, Meaning: {meaning})")

        return {
            'word': word,
            'pos': pos_str,
            'meaning': meaning or f"{word} (학습 어휘)",
            'meaning_options': korean_meaning_options,
            'priority': priority,
            'topic': '일반 업무',
            'collocation': collocation,
            'trap_point': trap_point,
            'example_en': example_en,
            'example_ko': example_ko
        }
