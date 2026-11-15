#!/usr/bin/env python3
"""Unified sealed workspace regression in an isolated browser profile."""
import sys
from orca_browser import Browser
b = Browser(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173/', 'Sealed release')
try:
    assert 'Простой' not in b.body() and 'Экспертный' not in b.body()
    assert 'Источники параметров' not in b.body() and '90%' not in b.body()
    baseline=b.metrics()
    b.fill('Целевой чистый объём Vb, л',30)
    assert b.metrics()!=baseline
    b.select('Основа графика','construction')
    assert b.metrics()!=baseline
    b.click('2D короб')
    assert 'Габариты и посадка динамика' in b.evaluate("document.querySelector('main').outerHTML")
    b.click('3D')
    b.command('wait','--selector','canvas')
    assert b.evaluate("!!document.querySelector('canvas')")
    b.click('Чертёж')
    assert b.evaluate("!!document.querySelector('main svg')")
    b.click('График')
    b.evaluate("document.querySelector('details[aria-label=\"Монтаж динамика\"]').open=true")
    b.fill('Внешний диаметр рамы, мм',400)
    b.evaluate("document.querySelector('details[aria-label=\"Объём оборудования\"]').open=true")
    b.fill('Вытеснение динамика, л',4)
    b.fill('Объём распорок и деталей, л',1)
    b.reload()
    assert b.value('Целевой чистый объём Vb, л')=='30'
    assert b.evaluate("document.querySelector('select[aria-label=\"Основа графика\"]').value")=='construction'
    b.select('Пример динамика','1')
    assert b.value('Fs, Гц')=='28.43'
    b.fill('Fs, Гц','')
    assert 'Проверьте настройки расчёта' in b.body()
    b.fill('Fs, Гц',28.43)
    for width in [320,390,768,1440]:
        b.command('viewport','--width',str(width),'--height','950')
        assert b.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
    print('Desktop screenshot:', b.command('screenshot'), flush=True)
    b.command('viewport','--width','390','--height','844')
    print('Mobile screenshot:', b.command('screenshot'), flush=True)
    print('PASS: unified views, target input, basis, 3D, drawing, reload, presets, validation, 320/390/768/1440px')
finally:
    b.close()
