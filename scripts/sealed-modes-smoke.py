#!/usr/bin/env python3
"""Check simple/expert modes, volume truthfulness and local draft on a real production build.
Usage: python3 scripts/sealed-modes-smoke.py http://localhost:5175/
Requires running Orca. Uses its own isolated profile, never the owner's saved draft.
"""
import json
import sys
from orca_browser import Browser

url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5175/"
b = Browser(url, "TBox sealed modes")
checks = []


def passed(text):
    checks.append(text)
    print("PASS " + text, flush=True)


def selected_mode():
    return b.evaluate("document.querySelector('[aria-label=\"Режим калькулятора ЗЯ\"] button[aria-pressed=true]').textContent")


def graph_path():
    return b.evaluate("document.querySelector('svg[aria-label=\"АЧХ закрытого ящика\"] path.stroke-orange-400').getAttribute('d')")


assert selected_mode() == "Простой"
assert b.metrics() == ["0.40", "48.5 Гц", "101.4 Гц"]
assert not b.evaluate("!!document.querySelector('input[aria-label=\"Fs, Гц\"]')")
assert "Чистый Vb пока неизвестен" in b.body() and "40.51 л" in b.body()
assert b.value("Целевой чистый объём Vb, л") == "20"
baseline = b.metrics()
base_path = graph_path()
b.check("Учитывать салон автомобиля")
assert b.metrics() == baseline and graph_path() != base_path
b.check("Учитывать салон автомобиля", False)
assert graph_path() == base_path
passed("first visit is simple;20L target is not confused with40.51L cavity; cabin preserves metrics")

b.select("Пример динамика", "1")
simple_jl = b.metrics()
assert "Вытеснение не задано" not in b.body()
b.click("Экспертный")
assert b.metrics()[:3] == simple_jl
assert b.value("Fs, Гц") == "28.43"
assert b.value("Вытеснение динамика, л") == "1.36"
b.select("Пример динамика", "0")
assert b.value("Вытеснение динамика, л") == ""
assert "Чистый Vb пока неизвестен" in b.body()
passed("EDGE/JL selection works in simple mode; expert sees same metrics and correct preset displacement")

b.fill("Fs, Гц", "31")
b.check("Задать внутренние размеры вручную")
for name, value in [("Ширина внутри, мм",450),("Высота внутри, мм",420),("Глубина внутри, мм",300)]:
    b.fill(name, value)
b.fill("Внешний диаметр рамы, мм",400)
b.fill("Вытеснение динамика, л",4)
b.fill("Объём распорок и деталей, л",1)
b.click("Разместить по центру")
assert "51.70 л" in b.body()
b.click("3D")
b.command("wait", "--selector", "canvas")
assert "486 × 456 × 336 мм" in b.body()
expert_metrics = b.metrics()
b.click("Простой")
assert b.metrics() == expert_metrics[:3]
assert "ручной набор" in b.body()
assert not b.evaluate("!!document.querySelector('input[aria-label=\"Fs, Гц\"]')")
assert not b.evaluate("!!document.querySelector('input[aria-label=\"Вытеснение динамика, л\"]')")
b.click("Принять расчётный объём")
assert b.value("Целевой чистый объём Vb, л") == "51.7"
assert b.metrics() == expert_metrics[:3]
b.click("Экспертный")
assert b.metrics() == expert_metrics
assert b.value("Fs, Гц") == "31"
assert b.value("Объём распорок и деталей, л") == "1"
assert b.value("Ширина внутри, мм") == "450"
assert b.evaluate("document.querySelector('[aria-label=\"Вид расчёта\"] button[aria-pressed=true]').textContent") == "3D"
passed("mode switch preserves editedTS, selected3D view, manual sizes and both volume deductions; explicit target adoption keeps response")

b.reload()
b.command("wait", "--selector", "canvas")
assert selected_mode() == "Экспертный"
assert b.value("Fs, Гц") == "31" and b.value("Вытеснение динамика, л") == "4"
assert b.value("Целевой чистый объём Vb, л") == "51.7"
assert "Черновик восстановлен" in b.body()
passed("reload restores mode, expert view, manual input and exact draft instead of reapplying a preset")

b.click("Чертёж")
assert "486 × 456 × 18" in b.body() and "X = 243 мм, Y = 228 мм" in b.body()
b.click("График")
b.evaluate("document.querySelector('details[aria-label=\"Настройка поправки салона\"]').open=true")
b.fill("Центр подъёма, Гц",55)
b.fill("Ширина подъёма, октавы",1.5)
b.fill("Подъём салона, дБ",5)
metrics_before = b.metrics()
b.check("Учитывать салон автомобиля")
assert "5 дБ при 55 Гц" in b.body() and b.metrics() == metrics_before
b.fill("Ширина подъёма, октавы",0)
assert "Ширина поправки салона" in b.body()
assert b.evaluate("!!document.querySelector('svg[aria-label=\"АЧХ закрытого ящика\"]')")
assert b.metrics() == metrics_before
b.fill("Ширина подъёма, октавы",1.5)
b.click("Простой")
assert b.metrics() == metrics_before[:3]
assert "5 дБ при 55 Гц" in b.body()
b.click("Экспертный")
passed("drawing uses shared coordinates; expert cabin controls survive mode switch; invalid cabin input cannot crash the graph")

b.fill("Ширина внутри, мм",0)
assert b.metrics() == []
b.click("Простой")
assert "Ширина внутри" in b.body() and b.metrics() == []
b.click("Открыть настройки")
assert b.value("Ширина внутри, мм") == "0"
b.fill("Ширина внутри, мм", "")
b.reload()
assert b.value("Ширина внутри, мм") == ""
assert b.metrics() == []
b.fill("Ширина внутри, мм",450)
assert b.metrics() == metrics_before
b.fill("Вытеснение динамика, л",1000)
assert "Вытеснение оборудования не оставляет" in b.body()
b.click("Простой")
assert b.metrics() == [] and "Вытеснение оборудования" in b.body()
b.click("Открыть настройки")
b.fill("Вытеснение динамика, л",4)
passed("invalid hidden geometry and impossible displacement remain visible in simple mode; empty/invalid values survive reload and recover")

b.click("Простой")
b.select("Пример динамика",1)
assert "54.34 л" in b.body()
b.click("Экспертный")
assert b.value("Ширина внутри, мм") == "450"
assert b.value("Вытеснение динамика, л") == "1.36"
assert b.value("Fs, Гц") == "28.43"
b.select("Пример динамика",0)
assert b.value("Fs, Гц") == "32.3" and b.value("Вытеснение динамика, л") == ""
assert "Чистый Vb пока неизвестен" in b.body()
passed("changing presets preserves construction and target, resetsTS and driver displacement with provenance, and never assigns3–5L automatically")

b.fill("Вытеснение динамика, л",4)
for width in [320,390,768,1440]:
    args = ["viewport", "--width", str(width), "--height", "900"] + (["--mobile"] if width<500 else [])
    b.command(*args)
    for mode in ["Простой","Экспертный"]:
        b.click(mode)
        assert b.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width,mode)
        if mode == "Экспертный":
            for view in ["2D короб","Чертёж","3D","График"]:
                b.click(view)
                assert b.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width,mode,view)
        hint = "Нижняя граница · f3" if mode == "Простой" else "f3"
        b.click("Подсказка: " + hint)
        rect = b.evaluate("(()=>{const r=document.querySelector('[role=tooltip]').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}})()")
        assert rect["left"] >= 0 and rect["right"] <= rect["width"] + 1,rect
        assert rect["top"] >= 0 and rect["bottom"] <= rect["height"] + 1,rect
        b.command("keypress", "--key","Escape")
        assert not b.evaluate("!!document.querySelector('[role=tooltip]')")
# An open portal must not remain detached from its anchor after scroll/resize.
b.click("Подсказка: f3")
b.evaluate("window.scrollBy(0,100)")
b.command("wait", "--selector", "[role=tooltip]", "--state", "hidden")
b.click("Подсказка: f3")
b.command("viewport", "--width", "1400", "--height", "880")
b.command("wait", "--selector", "[role=tooltip]", "--state", "hidden")
passed("320/390/768/1440px: both modes, all expert views and portal hints stay inside viewport; Escape closes hints")

b.fill("Fs, Гц",31)
b.click("Новый расчёт")
assert b.value("Fs, Гц") == "32.3"
b.click("Вернуть предыдущий")
assert b.value("Fs, Гц") == "31"
b.evaluate("localStorage.setItem('tbox.sealed-draft.v1','{broken')")
b.reload()
assert selected_mode() == "Простой"
assert b.metrics() == ["0.40","48.5 Гц","101.4 Гц"]
b.evaluate("(()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('Storage unavailable for test')}});return true})()")
b.fill("Целевой чистый объём Vb, л",25)
b.command("wait","--text","Локальное сохранение недоступно")
assert b.value("Целевой чистый объём Vb, л") == "25"
assert len(b.metrics()) == 3
passed("new calculation has undo; corrupted storage recovers safely; unavailable storage leaves calculations usable with honest status")

console = b.command("console","--limit","100")
assert not [entry for entry in console.get("entries",[]) if entry.get("level")=="error"],console
print(json.dumps({"url":url,"page":b.page,"passed":checks,"console":console},ensure_ascii=False,indent=2))
b.close()
