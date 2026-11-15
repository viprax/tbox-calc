#!/usr/bin/env python3
"""Run against a local dev/preview server through Orca's embedded browser.
Usage: python3 scripts/browser-smoke.py [http://127.0.0.1:5174/]
Requires a running Orca desktop and its CLI; no external data or accounts.
"""
import json
import os
import subprocess
import sys

orca = os.environ.get("ORCA_CLI_COMMAND", "orca-ide")
url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5174/"


def command(*args):
    completed = subprocess.run([orca, *args, "--json"], capture_output=True, text=True, timeout=30)
    if completed.returncode:
        raise RuntimeError(completed.stderr or completed.stdout)
    response = json.loads(completed.stdout)
    if not response.get("ok"):
        raise RuntimeError(response)
    return response["result"]


profile = command("tab", "profile", "create", "--label", "TBox legacy geometry smoke", "--scope", "isolated")["profile"]["id"]
page = command("tab", "create", "--url", url, "--profile", profile)["browserPageId"]
command("wait", "--page", page, "--selector", "main b")
command("capture", "start", "--page", page)


def evaluate(expression):
    result = command("eval", "--page", page, "--expression", "JSON.stringify(" + expression + ")")
    return json.loads(result["result"])


def control(role, name):
    refs = command("snapshot", "--page", page, "--interactive")["refs"]
    matches = ["@" + key for key, value in refs.items() if value.get("role") == role and (value.get("name") == name or value.get("name", "").startswith(name))]
    assert len(matches) == 1, (role, name, refs)
    return matches[0]


def fill(name, value):
    command("fill", "--page", page, "--element", control("spinbutton", name), "--value", value)


def metrics():
    return evaluate('[...document.querySelectorAll("main b")].filter(x => x.getClientRects().length).map(x => x.textContent)')


def body():
    return evaluate("document.body.innerText")


def click(name):
    command("click", "--page", page, "--element", control("button", name))


def select(name, value):
    command("select", "--page", page, "--element", control("combobox", name), "--value", value)


def visible_input(name):
    return evaluate("[...document.querySelectorAll('input')].filter(x=>x.getClientRects().length).find(x=>x.getAttribute('aria-label')===" + json.dumps(name) + ").value")


class Checks(list):
    def append(self, text):
        super().append(text)
        print("PASS " + text, flush=True)

checks = Checks()
# Recreate the previous explicit15mm/0mm layout as a regression fixture.
click("Экспертный")
fill("Запас панели, мм/сторону", "15")
fill("Зазор за динамиком, мм", "0")
assert metrics() == ["0.43", "52.0 Гц", "99.3 Гц", "0.0 дБ"], metrics()
assert visible_input("Fs, Гц") == "32.3"
assert evaluate("document.documentElement.lang") == "ru"
assert evaluate("document.title").startswith("TBox")
assert "EDGE EDS15D1-E7" in body()
checks.append("owner EDGE starts with historical Ql10 and actual net volume")

for invalid in ["0", "-1", ""]:
    fill("Целевой чистый объём Vb, л", invalid)
    assert metrics() == []
    assert "NaN" not in body() and "Infinity" not in body()
fill("Целевой чистый объём Vb, л", "20")
assert metrics() == ["0.43", "52.0 Гц", "99.3 Гц", "0.0 дБ"]
checks.append("zero, negative and empty input recover without stale calculations")

select("Пример динамика", "1")
assert visible_input("Fs, Гц") == "28.43"
click("2D короб")
assert "1.36 л" in body() and "Глубина 137 мм" in body() and "281" in body()
assert evaluate("[...document.querySelectorAll('svg')].some(x=>x.getClientRects().length && x.getAttribute('aria-label')?.includes('Спереди:'))")
click("3D")
command("wait", "--page", page, "--selector", "canvas")
assert "137" in body() or "Динамик схематичный" in body()
click("График")
select("Пример динамика", "0")
assert visible_input("Fs, Гц") == "32.3"
click("2D короб")
assert "0.00 л" in body() and "Глубина 245 мм" in body() and "375" in body()
checks.append("EDGE/JL switch resets cutout, mount depth and displacement; 2D restored")

command("check", "--page", page, "--element", control("checkbox", "Ограничить габариты багажника"))
fill("Высота", "300")
assert "411 мм" in body()
assert evaluate("[...document.querySelectorAll('svg')].some(x=>x.getClientRects().length && x.getAttribute('aria-label')?.includes('300'))")
fill("Высота", "500")
checks.append("hard niche height stays at300mm despite15-inch front-panel conflict")

click("3D")
command("wait", "--page", page, "--selector", "canvas")
assert evaluate("!!document.querySelector('section[aria-label=\"3D-модель закрытого ящика\"] canvas')")
click("Снять переднюю стенку")
assert "вид изнутри" in body()
click("Вернуть переднюю стенку")
checks.append("restored WebGL3D scene, driver and removable front wall")
# Production sealed-box scenarios: same dimensions in manual mode, 2D, 3D and drawing.
click("2D короб")
auto_front = evaluate("document.querySelector('svg[aria-label^=\"Спереди:\"]').getAttribute('aria-label')")
command("check", "--page", page, "--element", control("checkbox", "Задать внутренние размеры вручную"))
assert visible_input("Ширина внутри, мм") == "375"
assert visible_input("Высота внутри, мм") == "375"
assert visible_input("Глубина внутри, мм") == "227"
assert evaluate("document.querySelector('svg[aria-label^=\"Спереди:\"]').getAttribute('aria-label')") == auto_front
for name, value in [("Ширина внутри, мм", "450"), ("Высота внутри, мм", "420"), ("Глубина внутри, мм", "300")]:
    fill(name, value)
assert "56.70 / 56.70 л" in body()
assert metrics() == ["0.37", "44.5 Гц", "103.7 Гц", "0.0 дБ"], metrics()
fill("Внешний диаметр рамы, мм", "400")
click("Разместить по центру")
assert visible_input("Центр выреза X, мм") == "243"
assert visible_input("Центр выреза Y, мм") == "228"
assert "Спереди: 486 × 456 мм" == evaluate("document.querySelector('svg[aria-label^=\"Спереди:\"]').getAttribute('aria-label')")
click("3D")
command("wait", "--page", page, "--selector", "canvas")
assert "486 × 456 × 336 мм" in body()
click("Скрыть динамик")
click("Показать динамик")
click("Снять переднюю стенку")
assert "вид изнутри" in body()
click("Вернуть переднюю стенку")
click("Чертёж")
assert "486 × 456 × 18" in body() and "300 × 456 × 18" in body() and "450 × 300 × 18" in body()
assert "X = 243 мм, Y = 228 мм" in body()
assert "Вырез Ø375 мм" in body()
fill("Центр выреза X, мм", "20")
assert "пересекает соседние стенки" in body()
fill("Центр выреза X, мм", "")
assert evaluate("!!document.querySelector('p[role=alert]')")
click("Разместить по центру")
fill("Ширина внутри, мм", "0")
assert not evaluate("!!document.querySelector('section[aria-label=\"Размерный чертёж панелей\"]')")
fill("Ширина внутри, мм", "450")
click("3D")
command("wait", "--page", page, "--selector", "canvas")
fill("Ширина внутри, мм", "200")
assert "Динамик не показан" in body()
fill("Ширина внутри, мм", "450")
fill("Глубина внутри, мм", "100")
assert "За динамиком остаётся" in body()
fill("Глубина внутри, мм", "300")
fill("Глубина установки, мм", "0")
assert "Глубина динамика на 3D-виде условная" in body()
fill("Глубина установки, мм", "245")
fill("Диаметр выреза, мм", "")
assert "Динамик не показан: задайте диаметр выреза" in body()
click("Снять переднюю стенку")
assert "Динамик схематичный" in body()
assert "Динамик не показан: задайте диаметр выреза" not in body()
click("Вернуть переднюю стенку")
fill("Диаметр выреза, мм", "375")
fill("Вытеснение динамика, л", "1000")
assert "Вытеснение оборудования не оставляет полезного объёма" in body()
assert not evaluate("!!document.querySelector('section[aria-label=\"3D-модель закрытого ящика\"]')")
fill("Вытеснение динамика, л", "")
assert "Чистый Vb пока неизвестен" in body()
fill("Вытеснение динамика, л", "-1")
assert evaluate("document.querySelector('input[aria-label=\"Вытеснение динамика, л\"]').getAttribute('aria-invalid')") == "true"
assert evaluate("document.querySelector('input[aria-label=\"Глубина установки, мм\"]').getAttribute('aria-invalid')") is None
fill("Вытеснение динамика, л", "0")
fill("Внешний диаметр рамы, мм", "")
fill("Номинальный диаметр динамика, дюймы", "")
assert "Динамик не показан: задайте внешний или номинальный диаметр" in body()
fill("Номинальный диаметр динамика, дюймы", "15")
click("Чертёж")
assert "Внешний контур оценён" in body()
command("uncheck", "--page", page, "--element", control("checkbox", "Задать внутренние размеры вручную"))
click("Разместить по центру")
click("2D короб")
assert "31.92 / 31.92 л" in body()
checks.append("manual dimensions seed from current geometry; all axes, 2D/3D/drawing, centre conflicts, invalid input, unknown mounting data, narrow box and automatic recovery")

click("График")
before = metrics()
path = evaluate("document.querySelector('svg[aria-label=\"АЧХ закрытого ящика\"] path.stroke-orange-400').getAttribute('d')")
# Fix measurement lines at40/80Hz and hover at60Hz before toggling cabin gain.
evaluate("""(() => {const svg = document.querySelector('svg[aria-label="АЧХ закрытого ящика"]'); const rect = svg.getBoundingClientRect(); const send = (type,f) => svg.dispatchEvent(new MouseEvent(type,{bubbles:true,clientX:rect.left+(44+Math.log(f/10)/Math.log(30)*584)/640*rect.width,clientY:rect.top+rect.height/2,button:0}));send('click',40);send('click',80);send('mousemove',60);return true;})()""")
def graph_labels():
    return evaluate("[...document.querySelectorAll('svg[aria-label=\"АЧХ закрытого ящика\"] text')].map(t=>t.textContent).filter(t=>t.includes('Гц,') || t.includes('разница'))")
baseline_labels = graph_labels()
command("check", "--page", page, "--element", control("checkbox", "Учитывать салон автомобиля"))
assert metrics() == before
assert evaluate("document.querySelector('svg[aria-label=\"АЧХ закрытого ящика\"] path.stroke-orange-400').getAttribute('d')") != path
assert evaluate("!!document.querySelector('path[data-curve=base]') && !!document.querySelector('path[data-curve=cabin]')")
with_cabin_labels = graph_labels()
import re
cursor_level = lambda labels: float(re.search(r', ([+-]?[0-9.]+) дБ', next(t for t in labels if 'Гц,' in t)).group(1))
assert abs(cursor_level(with_cabin_labels) - cursor_level(baseline_labels) - 3) < 0.11
assert next(t for t in baseline_labels if 'разница' in t) != next(t for t in with_cabin_labels if 'разница' in t)
command("uncheck", "--page", page, "--element", control("checkbox", "Учитывать салон автомобиля"))
assert graph_labels() == baseline_labels
markers_before = evaluate("[...document.querySelectorAll('svg[aria-label=\"АЧХ закрытого ящика\"] line.stroke-sky-400')].map(l=>l.getAttribute('x1'))")
evaluate("document.querySelector('svg[aria-label=\"АЧХ закрытого ящика\"]').dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'ArrowRight'}))")
markers_after = evaluate("[...document.querySelectorAll('svg[aria-label=\"АЧХ закрытого ящика\"] line.stroke-sky-400')].map(l=>l.getAttribute('x1'))")
assert markers_after[0] == markers_before[0] and float(markers_after[1]) > float(markers_before[1])
checks.append("cabin +3dB at60Hz changes curve/cursor/two-line difference, preserves metrics, and resets exactly")

click("Фазоинвертор")
assert "EDGE EDS15D1-E7" in body() and "Недостаточно данных" in body()
assert evaluate("!!document.querySelector('svg[aria-label=\"АЧХ фазоинвертора\"]')")
fill("Vb (нетто), л", "0")
assert "Заполни все поля" in body()
fill("Vb (нетто), л", "1e308")
assert metrics() == []
assert "ожидалось конечное число" in body()  # Existing FI validation reports the rejected overflow explicitly.
fill("Vb (нетто), л", "190")
evaluate("[...document.querySelectorAll('details')].find(d=>d.getClientRects().length).open = true")
click("Физический порт мастера")
assert evaluate("document.querySelector('select[aria-label=\"Геометрическая модель порта\"]').value") == "physical"
click("JBL · 190 л / 30 Гц")
assert evaluate("document.querySelectorAll('svg[aria-label=\"АЧХ фазоинвертора\"] path').length") == 1
assert evaluate("document.querySelectorAll('svg[aria-label=\"АЧХ фазоинвертора\"] circle').length") == 0
select("Пример динамика", "1")
assert "JL Audio 12W0v3-4" in body()
checks.append("ported calculator, invalid-input recovery, clean response graph and driver selection")

click("Открыть меню")
click("Как пользоваться")
assert "От параметров динамика до размеров короба" in body()
click("Вернуться к закрытому ящику")
command("viewport", "--page", page, "--width", "390", "--height", "844", "--mobile")
assert evaluate("document.documentElement.scrollWidth <= window.innerWidth")
for mode in ["2D короб", "Чертёж", "3D", "График"]:
    click(mode)
    if mode == "3D":
        command("wait", "--page", page, "--selector", "canvas")
    assert evaluate("document.documentElement.scrollWidth <= window.innerWidth"), mode
command("viewport", "--page", page, "--width", "320", "--height", "740", "--mobile")
for mode in ["2D короб", "Чертёж", "3D", "График"]:
    click(mode)
    assert evaluate("document.documentElement.scrollWidth <= window.innerWidth"), mode
checks.append("restored menu/help and320/390px layout across chart, 2D, 3D and drawing")

console = command("console", "--page", page, "--limit", "50")
assert not [entry for entry in console.get("entries", []) if entry.get("level") == "error"], console
print(json.dumps({"page": page, "url": url, "passed": checks, "console": console}, ensure_ascii=False, indent=2))

command("tab", "close", "--page", page)
command("tab", "profile", "delete", "--profile", profile)
