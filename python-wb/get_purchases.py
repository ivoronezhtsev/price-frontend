import json
import asyncio
import re
import httpx
from playwright.async_api import async_playwright

USER_DATA_DIR = "./wildberries_profile"


def clean_wb_price(raw_price: str) -> int:
    if not raw_price:
        return 0
    text = raw_price.replace("\xa0", "").replace(" ", "")
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else 0


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
        chrome_path = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

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
            await page.wait_for_selector(".archive-page__item", timeout=30000)

            # Небольшая пауза для финализации рендеринга (на 500мбит хватит и 1 сек)
            await page.wait_for_timeout(1500)

            items = await page.query_selector_all(".archive-page__item")
            print(f"Вижу элементов на странице: {len(items)}")

            items_data = []
            for item in items:
                brand_el = await item.query_selector(".archive-item__brand")
                price_el = await item.query_selector(".archive-item__price")
                date_el = await item.query_selector(".archive-item__receive-date")

                raw_price = await price_el.inner_text() if price_el else ""
                raw_date = await date_el.inner_text() if date_el else ""

                img_el = await item.query_selector("img")
    
                # Извлекаем атрибут src (или data-src-pb, если src еще не заполнен)
                img_url = None
                if img_el:
                    img_url = await img_el.get_attribute("src")
                    # Если src пустой или содержит base64 заглушку, берем из data-src-pb
                    if not img_url or "data:image" in img_url:
                        img_url = await img_el.get_attribute("data-src-pb")

                items_data.append(
                    {
                        "brand": (await brand_el.inner_text()).strip()
                        if brand_el
                        else "null",
                        "price": clean_wb_price(raw_price),
                        "receive_date": raw_date,
                        "image_url": img_url
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
