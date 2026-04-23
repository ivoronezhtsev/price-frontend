import json
import asyncio
import re
import httpx
from playwright.async_api import async_playwright

USER_DATA_DIR = "./wildberries_profile"


#def clean_wb_price(raw_price: str) -> int:
#    if not raw_price:
#        return 0
#    text = raw_price.replace("\xa0", "").replace(" ", "")
#    match = re.search(r"(\d+)", text)
#    return int(match.group(1)) if match else 0


def save_to_json(data: list, filename: str = "wb_purchases.json"):
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"[OK] Данные сохранены в {filename} (всего: {len(data)})")
    except Exception as e:
        print(f"[ERROR] Ошибка записи: {e}")

async def push_to_backend(data: list):
    url = "http://localhost:8080/wb-purchases"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data, timeout=10.0)
            if response.status_code == 200:
                print(f"[PUSH] Бэкенд ответил: {response.text}")
            else:
                print(f"[PUSH] Ошибка бэкенда: {response.status_code}")
        except Exception as e:
            print(f"[PUSH] Не удалось связаться с бэкендом: {e}")


async def get_wb_purchases():
    async with async_playwright() as p:
        chrome_path = "/usr/bin/google-chrome"
        context = await p.chromium.launch_persistent_context(
            USER_DATA_DIR,
            executable_path=chrome_path,
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = await context.new_page()

        print("Перехожу в архив покупок...")
        await page.goto("https://www.wildberries.ru/lk/myorders/archive")

        try:
            # Ждем появления хотя бы одного айтема 30 секунд
            print("Ожидаю загрузки товаров (30 сек)...")
            await page.wait_for_selector(".archivePageItem--PYg9z", timeout=30000)

            # Небольшая пауза для финализации рендеринга (на 500мбит хватит и 1 сек)
            await page.wait_for_timeout(1500)

            items = page.locator(".archivePageItem--PYg9z") 
            count = await items.count()

            print(f"Вижу элементов на странице: {count}")

            items_data = []
            for i in range(count):
                item = items.nth(i)
                
                # Инициализируем переменные, чтобы если поиск упадет, в JSON ушло None или ""
                brand_text = None
                price_text = None
                date_text = None
                img_url = None

                # 1. БРЕНД
                try:
                    brand_el = item.locator("div[class*='nameContainer'] span").nth(2)
                    brand_text = await brand_el.inner_text(timeout=2000)
                except Exception:
                    try:
                        brand_text = await item.locator("div[class*='nameContainer'] span").first.inner_text(timeout=2000)
                    except Exception:
                        print(f"Элемент {i}: бренд не найден")

                # 2. ЦЕНА
                price_int = 0  # Дефолтное значение для бэкенда
                try:
                    price_raw = await item.locator("div[class*='priceContainer'] h3").inner_text(timeout=2000)
                    
                    # Оставляем только цифры (убирает пробелы, значки валют, спецсимволы \xa0)
                    price_digits = re.sub(r"\D", "", price_raw)
                    
                    if price_digits:
                        price_int = int(price_digits)
                    
                    print(f"Цена (int): {price_int}")
                except Exception:
                    print(f"Элемент {i}: цена не найдена")

                # 3. ДАТА
                try:
                    date_text = await item.locator("div[class*='receiveDateContainer'] span span").first.inner_text(timeout=2000)
                except Exception:
                    print(f"Элемент {i}: дата не найдена")

                                # --- ФОТО ---
                img_url = None
                try:
                    img_el = item.locator("div[class*='photoContainer'] img")
                    # Пробуем получить основной src с коротким таймаутом
                    img_url = await img_el.get_attribute("src", timeout=2000)
                    
                    # Если src — это заглушка (base64), пробуем вытянуть реальный путь
                    if img_url and "data:image" in img_url:
                        img_url = await img_el.get_attribute("data-src-pb", timeout=1000)
                except Exception:
                    print(f"Элемент {i}: фото не найдено, ставим null")
                    img_url = None

                # --- ДОБАВЛЕНИЕ В СПИСОК ---
                items_data.append(
                    {
                        "brand": brand_text.strip() if brand_text else None,
                        "price": price_int,
                        "receive_date": date_text.strip() if date_text else None,
                        "image_url": img_url, # Сюда попадет либо URL, либо None
                        "barcode": None
                    }
                )
            # Сохраняем один раз в конце
            await push_to_backend(items_data)
            save_to_json(items_data)

        except Exception as e:
            await page.screenshot(path="debug_error.png")
            print(f"Критическая ошибка или таймаут: {e}")

        finally:
            await context.close()


if __name__ == "__main__":
    asyncio.run(get_wb_purchases())
