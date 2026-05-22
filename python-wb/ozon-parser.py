import os
import re
import json
import base64
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)

def parse_receipt_text(text):
    """Извлекает данные из текста письма Ozon с помощью регулярных выражений."""
    # Ищем номер заказа (обычно формат: 12345678-0001)
    order_match = re.search(r'№\s*(\d{8}-\d{4})', text)
    order_id = order_match.group(1) if order_match else "Не найден"

    # Ищем сумму (например: 1 500 ₽ или 1500 руб)
    # Исключаем суммы скидок, ищем именно итоговую оплату
    price_match = re.search(r'(?:Итого|Оплачено|Сумма|Всего)[:\s]*([\d\s]+(?:[\.,]\d{2})?)\s*(?:₽|руб)', text, re.IGNORECASE)
    total_price = price_match.group(1).replace('\xa0', '').strip() if price_match else "Не найдена"

    return {
        "order_id": order_id,
        "total_price": total_price
    }

def get_email_body(payload):
    """Рекурсивно извлекает текст письма из структуры payload."""
    if 'body' in payload and payload['body'].get('data'):
        return base64.urlsafe_b64decode(payload['body']['data'].encode('UTF-8')).decode('UTF-8', errors='ignore')
    
    if 'parts' in payload:
        for part in payload['parts']:
            body = get_email_body(part)
            if body:
                return body
    return ""

def collect_receipts_to_json():
    service = get_gmail_service()
    
    # Ищем письма от Ozon, где упоминается заказ или чек
    query = 'from:mailer@sender.ozon.ru "заказ" "оплачен"'
    
    print("Поиск писем в Gmail...")
    results = service.users().messages().list(userId='me', q=query, maxResults=50).execute()
    messages = results.get('messages', [])

    if not messages:
        print("Письма не найдены.")
        return

    receipts_data = []

    print(f"Обработка {len(messages)} писем...")
    for msg in messages:
        message = service.users().messages().get(userId='me', id=msg['id']).execute()
        payload = message.get('payload', {})
        
        # Получаем дату отправки письма
        headers = payload.get('headers', [])
        date = next((h['value'] for h in headers if h['name'].lower() == 'date'), "Не указана")
        
        # Получаем текст письма
        body_text = get_email_body(payload)
        
        if body_text:
            # Парсим данные из текста
            parsed_info = parse_receipt_text(body_text)
            
            # Добавляем в общий список
            receipts_data.append({
                "message_id": msg['id'],
                "date": date,
                "order_id": parsed_info["order_id"],
                "total_price": parsed_info["total_price"]
            })

    # Сохраняем все данные в один JSON-файл
    output_file = 'ozon_receipts.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(receipts_data, f, ensure_ascii=False, indent=4)

    print(f"Успешно! Все данные сохранены в файл: {output_file}")

if __name__ == '__main__':
    collect_receipts_to_json()
