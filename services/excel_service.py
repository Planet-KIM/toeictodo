import os
import zipfile
import unicodedata
import xml.etree.ElementTree as ET
from config import Config

def norm(text):
    if not text:
        return ''
    return unicodedata.normalize('NFC', str(text)).strip()

class ExcelService:
    _cached_data = None

    @classmethod
    def get_data(cls):
        if cls._cached_data:
            return cls._cached_data

        filepath = Config.EXCEL_FILE
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found.")
            return {'words': [], 'pairs': [], 'traps': []}

        try:
            with zipfile.ZipFile(filepath, 'r') as z:
                ss = []
                if 'xl/sharedStrings.xml' in z.namelist():
                    ss_xml = z.read('xl/sharedStrings.xml')
                    root = ET.fromstring(ss_xml)
                    for si in root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                        text = ''
                        for node in si.iter():
                            if node.tag.endswith('t') and node.text:
                                text += node.text
                        ss.append(norm(text))

                wb_xml = z.read('xl/workbook.xml')
                wb_root = ET.fromstring(wb_xml)
                rels_xml = z.read('xl/_rels/workbook.xml.rels')
                rels_root = ET.fromstring(rels_xml)

                rid_map = {}
                for r in rels_root.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
                    target = r.attrib['Target'].lstrip('/')
                    if not target.startswith('xl/'):
                        target = 'xl/' + target
                    rid_map[r.attrib['Id']] = target

                sheet_files = {}
                for s in wb_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
                    s_name = norm(s.attrib['name'])
                    r_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
                    sheet_files[s_name] = rid_map[r_id]

                def get_sheet_rows(s_name):
                    target = sheet_files.get(s_name)
                    if not target or target not in z.namelist():
                        return []
                    sheet_xml = z.read(target)
                    root = ET.fromstring(sheet_xml)
                    rows = []
                    for r in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                        row_vals = {}
                        for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                            cell_ref = c.attrib.get('r', '')
                            col = ''.join([ch for ch in cell_ref if ch.isalpha()])
                            t = c.attrib.get('t')
                            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                            val = v.text if v is not None else ''
                            if t == 's' and val != '' and val.isdigit():
                                idx = int(val)
                                val = ss[idx] if idx < len(ss) else val
                            elif t == 'inlineStr':
                                is_node = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is')
                                if is_node is not None:
                                    val = ''.join([t_node.text for t_node in is_node.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t_node.text])
                            row_vals[col] = norm(val)
                        rows.append(row_vals)
                    return rows

                words = []
                for s_name, pos in [('01_형용사_300', '형용사'), ('02_부사_250', '부사')]:
                    rows = get_sheet_rows(s_name)
                    for r in rows[1:]:
                        no = r.get('A', '')
                        word = r.get('B', '')
                        if not word:
                            continue
                        words.append({
                            'id': f"{pos}_{no}",
                            'no': int(no) if no.isdigit() else len(words)+1,
                            'pos': norm(pos),
                            'word': norm(word),
                            'meaning': norm(r.get('C', '')),
                            'priority': norm(r.get('E', 'A')),
                            'topic': norm(r.get('F', '일반 업무')),
                            'collocation': norm(r.get('G', '')),
                            'trap_point': norm(r.get('H', '')),
                            'example_en': norm(r.get('L', '')),
                            'example_ko': norm(r.get('M', ''))
                        })

                pairs = []
                rows_pair = get_sheet_rows('03_형용사-부사_세트')
                for r in rows_pair[1:]:
                    if r.get('A'):
                        pairs.append({
                            'adj_word': norm(r.get('A', '')),
                            'adj_meaning': norm(r.get('B', '')),
                            'adv_word': norm(r.get('C', '')),
                            'adv_meaning': norm(r.get('D', '')),
                            'priority': norm(r.get('E', '')),
                            'point': norm(r.get('F', ''))
                        })

                traps = []
                rows_trap = get_sheet_rows('04_함정_정리')
                for r in rows_trap[1:]:
                    if r.get('A'):
                        traps.append({
                            'type': norm(r.get('A', '')),
                            'example': norm(r.get('B', '')),
                            'guide': norm(r.get('C', ''))
                        })

                cls._cached_data = {'words': words, 'pairs': pairs, 'traps': traps}
                print(f"[ExcelService] Parsed and NFC normalized {len(words)} words, {len(pairs)} pairs, {len(traps)} traps.")
                return cls._cached_data
        except Exception as e:
            print(f"[ExcelService] Error reading Excel: {e}")
            return {'words': [], 'pairs': [], 'traps': []}

    @classmethod
    def get_words(cls):
        return cls.get_data()['words']

    @classmethod
    def get_pairs(cls):
        return cls.get_data()['pairs']

    @classmethod
    def get_traps(cls):
        return cls.get_data()['traps']

    @classmethod
    def get_stats(cls):
        data = cls.get_data()
        words = data['words']
        adj_count = sum(1 for w in words if norm(w['pos']) == '형용사')
        adv_count = sum(1 for w in words if norm(w['pos']) == '부사')
        prio_counts = {
            'A': sum(1 for w in words if norm(w['priority']) == 'A'),
            'B': sum(1 for w in words if norm(w['priority']) == 'B'),
            'C': sum(1 for w in words if norm(w['priority']) == 'C')
        }
        return {
            'total_words': len(words),
            'adj_count': adj_count,
            'adv_count': adv_count,
            'prio_counts': prio_counts,
            'pairs_count': len(data['pairs']),
            'traps_count': len(data['traps'])
        }
