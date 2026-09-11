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
    'as soon as': 'as soon as + S + V (~하자마자)',
    'as well as': 'A as well as B (~뿐만 아니라)',
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

KNOWN_PHRASES = {
    'in that': {
        'pos': '접속사',
        'meaning': '~라는 점에서, ~이기 때문에',
        'priority': 'A',
        'topic': '이유·측면',
        'collocation': 'in that + S + V (이유·측면 접속사)',
        'trap_point': 'in that절은 주어+동사(S+V) 절을 이끄는 복합 접속사. (전치사 in + 명사와 구분)',
        'example_en': 'The new system is advantageous in that it significantly reduces processing time.',
        'example_ko': '새 시스템은 처리 시간을 크게 줄여준다는 점에서 유리합니다.'
    },
    'now that': {
        'pos': '접속사',
        'meaning': '이제 ~이므로, ~이니까',
        'priority': 'A',
        'topic': '이유·시간',
        'collocation': 'now that + S + V',
        'trap_point': '이유 접속사 (because, since와 유사).',
        'example_en': 'Now that the project is completed, the team can focus on the next phase.',
        'example_ko': '이제 프로젝트가 완료되었으므로 팀은 다음 단계에 집중할 수 있습니다.'
    },
    'provided that': {
        'pos': '접속사',
        'meaning': '~라는 조건에서, ~하기만 하면',
        'priority': 'A',
        'topic': '조건',
        'collocation': 'provided that + S + V',
        'trap_point': '조건 접속사 (if와 유사).',
        'example_en': 'Employees may work remotely provided that they complete their daily tasks.',
        'example_ko': '일일 업무를 완료한다는 조건하에 직원들은 원격 근무를 할 수 있습니다.'
    },
    'providing that': {
        'pos': '접속사',
        'meaning': '~라는 조건에서, ~하기만 하면',
        'priority': 'A',
        'topic': '조건',
        'collocation': 'providing that + S + V',
        'trap_point': '조건 접속사 (if와 유사).',
        'example_en': 'The event will be held outdoors providing that it does not rain.',
        'example_ko': '비가 오지 않는다는 조건하에 행사는 야외에서 열릴 것입니다.'
    },
    'assuming that': {
        'pos': '접속사',
        'meaning': '~라고 가정하면',
        'priority': 'C',
        'topic': '조건',
        'collocation': 'assuming that + S + V',
        'trap_point': '가정적 조건 접속사.',
        'example_en': 'Assuming that the proposal is approved, construction will begin in May.',
        'example_ko': '제안서가 승인된다고 가정하면 5월에 공사가 시작될 것입니다.'
    },
    'considering that': {
        'pos': '접속사, 전치사',
        'meaning': '~임을 고려하면, ~이므로',
        'priority': 'B',
        'topic': '이유·고려',
        'collocation': 'considering that + S + V',
        'trap_point': 'considering(전치사+명사) vs considering that(접속사+절) 구분.',
        'example_en': 'Considering that he is new to the team, he performed exceptionally well.',
        'example_ko': '그가 팀에 신입임을 고려하면 그는 예외적으로 일을 잘했습니다.'
    },
    'given that': {
        'pos': '접속사',
        'meaning': '~임을 감안할 때, ~를 고려하면',
        'priority': 'B',
        'topic': '이유·고려',
        'collocation': 'given that + S + V',
        'trap_point': 'given(전치사) vs given that(접속사).',
        'example_en': 'Given that sales are rising, we expect higher annual profits.',
        'example_ko': '매출이 상승하고 있음을 감안할 때 더 높은 연간 수익을 기대합니다.'
    },
    'so that': {
        'pos': '접속사',
        'meaning': '~하도록, ~하기 위하여',
        'priority': 'A',
        'topic': '목적',
        'collocation': 'so that + S + can/may + V',
        'trap_point': '목적 접속사 (뒤에 조동사 can/may/will 동반).',
        'example_en': 'Please submit the report early so that the committee can review it.',
        'example_ko': '위원회가 검토할 수 있도록 보고서를 일찍 제출해 주세요.'
    },
    'in order that': {
        'pos': '접속사',
        'meaning': '~하기 위하여, ~하도록',
        'priority': 'B',
        'topic': '목적',
        'collocation': 'in order that + S + can/may + V',
        'trap_point': '목적 접속사구.',
        'example_en': 'The manager extended the deadline in order that all members could participate.',
        'example_ko': '모든 구성원이 참여할 수 있도록 관리자가 마감 시한을 연장했습니다.'
    },
    'except that': {
        'pos': '접속사',
        'meaning': '~라는 점만 제외하면',
        'priority': 'C',
        'topic': '제외',
        'collocation': 'except that + S + V',
        'trap_point': 'except(전치사) vs except that(접속사) 자리 구분.',
        'example_en': 'The vehicle is in perfect condition except that the battery needs replacement.',
        'example_ko': '배터리 교체가 필요하다는 점만 제외하면 차량 상태는 완벽합니다.'
    },
}

class AutoFetchService:
    @classmethod
    def fetch_word_details(cls, word):
        word_lower = word.strip().lower()
        logger.info(f"[AutoFetch] Fetching word details for '{word_lower}'...")

        # 0-A. Check Known TOEIC Compound Phrases (in that, now that, provided that, etc.)
        if word_lower in KNOWN_PHRASES:
            logger.info(f"[AutoFetch] Matched KNOWN_PHRASES dictionary for '{word_lower}'")
            kp = KNOWN_PHRASES[word_lower]
            meanings = [m.strip() for m in re.split(r'[,;/]', kp['meaning']) if m.strip()]
            return {
                'word': word,
                'pos': kp['pos'],
                'meaning': kp['meaning'],
                'meaning_options': meanings,
                'priority': kp.get('priority', 'A'),
                'topic': kp.get('topic', '일반 업무'),
                'collocation': kp.get('collocation', ''),
                'trap_point': kp.get('trap_point', ''),
                'example_en': kp.get('example_en', ''),
                'example_ko': kp.get('example_ko', '')
            }

        # 0-B. Check Local Database First for 100% Curated TOEIC Accuracy & Instant Response
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

        # Smart POS fallback if external dictionary APIs returned no POS tags or wrong POS tags
        if not found_pos_list or word_lower.endswith(' that') or ' ' in word_lower:
            if word_lower.endswith(' that') or ' ' in word_lower or any(word_lower.startswith(p) for p in ['as ', 'in ', 'by ', 'with ', 'for ', 'due ', 'owing ', 'according ', 'prior ', 'so ']):
                found_pos_list = ["접속사"]
            elif word_lower.endswith('ly'):
                found_pos_list = ["부사"]
            elif word_lower.endswith(('tion', 'ment', 'ness', 'ity', 'ance', 'ence', 'ship', 'er', 'or')):
                found_pos_list = ["명사"]
            else:
                found_pos_list = ["형용사"]

        pos_str = ", ".join(found_pos_list)

        # Fallback Example Sentence if DictionaryAPI has no example
        if not example_en:
            first_pos = found_pos_list[0]
            if "접속사" in first_pos or "전치사" in first_pos:
                example_en = f"Please process the application {word_lower} the team completes the final review."
                example_ko = f"팀이 최종 검토를 완료하는 대로 신청서를 처리해 주세요."
            elif "부사" in first_pos:
                example_en = f"The manager {word_lower} reviewed all pending budget proposals."
                example_ko = f"관리자는 대기 중인 모든 예산 안을 검토했습니다."
            elif "명사" in first_pos:
                example_en = f"The company announced a new {word_lower} to support employee development."
                example_ko = f"회사는 직원 개발을 지원하기 위한 새로운 안건을 발표했습니다."
            else:
                example_en = f"The new strategy proved to be highly effective in improving overall productivity."
                example_ko = f"새로운 전략은 전체적인 생산성을 향상시키는 데 매우 효과적인 것으로 입증되었습니다."

        # Translate Example Sentence to Korean if missing
        if example_en and not example_ko:
            try:
                url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(example_en)}&langpair=en|ko"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=2) as r:
                    data = json.loads(r.read().decode('utf-8'))
                    translated = data.get('responseData', {}).get('translatedText', '')
                    if translated:
                        example_ko = translated
            except Exception as e:
                logger.warning(f"[AutoFetch] Example translation error for '{word_lower}': {e}")
                example_ko = "해당 예문의 한국어 해석을 확인해 주세요."

        # Fetch TOEIC Collocation from preset map or POS-based template
        collocation = TOEIC_COLLOCATIONS.get(word_lower, "")
        if not collocation:
            if "접속사" in pos_str:
                collocation = f"{word_lower} + S + V (주어+동사 절 결합)"
            elif "전치사" in pos_str:
                collocation = f"{word_lower} + N / -ing (명사/동명사 목적어 결합)"
            elif "부사" in pos_str:
                collocation = f"{word_lower} + 동사/형용사 수식"
            elif "형용사" in pos_str:
                collocation = f"be {word_lower} for / to"
            else:
                collocation = f"{word_lower} + N"

        if "접속사" in pos_str or "전치사" in pos_str:
            trap_point = f"접속사(뒤에 절 S+V) vs 전치사(뒤에 명사/동명사) 수식 자리를 정확히 구분"
        elif "부사" in pos_str:
            trap_point = f"동사·형용사·다른 부사 또는 문장 전체를 수식하는 자리 확인"
        elif "명사" in pos_str:
            trap_point = f"가산명사/불가산명사 구분 및 관사·소유격 뒤 명사 자리 확인"
        else:
            trap_point = f"명사 앞 수식 또는 연결동사 뒤 형용사 자리 구분"
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
