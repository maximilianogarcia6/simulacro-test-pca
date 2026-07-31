import json
import re
from pathlib import Path
import fitz

PDF_PATH = Path('2-Banco-Piloto-Comercial-Avion-Jul-2023.pdf')
JSON_PATH = Path('quiz-data.json')
QUESTION_RE = re.compile(r'^(\d{4}(?:\.\d+)?)\.\-')
OPTION_RE = re.compile(r'^([ABC])\.\s*(.*)$')


def extract_pdf_answers():
    doc = fitz.open(PDF_PATH)
    parsed = {}
    current_id = None
    current_answer = None
    in_explanation = False

    for page_no in range(doc.page_count):
        page = doc[page_no]
        blocks = page.get_text('dict')['blocks']

        for block in blocks:
            if 'lines' not in block:
                continue

            block_text_parts = []
            block_bold = False
            for line in block['lines']:
                line_parts = []
                for span in line['spans']:
                    text = span['text'].strip()
                    if not text:
                        continue
                    line_parts.append(text)
                    if 'Bold' in span['font'] or bool(span['flags'] & 2):
                        block_bold = True
                if line_parts:
                    block_text_parts.append(' '.join(line_parts))

            if not block_text_parts:
                continue

            block_text = ' '.join(block_text_parts)
            m = QUESTION_RE.match(block_text)
            if m:
                if current_id is not None and current_answer:
                    parsed[current_id] = current_answer
                current_id = m.group(1)
                current_answer = None
                in_explanation = False
                continue

            if current_id is None:
                continue

            if block_text.startswith('Explicación'):
                in_explanation = True
                continue

            if in_explanation:
                continue

            option_match = OPTION_RE.match(block_text)
            if option_match:
                letter = option_match.group(1)
                option_text = option_match.group(2)
                if block_bold:
                    current_answer = letter
                continue

    if current_id is not None and current_answer:
        parsed[current_id] = current_answer

    return parsed


def main():
    data = json.loads(JSON_PATH.read_text())
    pdf_answers = extract_pdf_answers()

    updated = 0
    mismatches = []
    for item in data:
        qid = str(item['id'])
        if qid in pdf_answers:
            correct = pdf_answers[qid]
            if item.get('answer') != correct:
                mismatches.append((qid, item.get('answer'), correct))
                item['answer'] = correct
                updated += 1

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'updated answers: {updated}')
    print('sample mismatches:')
    for item in mismatches[:20]:
        print(item)


if __name__ == '__main__':
    main()
