#!/usr/bin/env python3
"""Regression: frequency edits update port geometry and curve. Uses isolated Orca profile."""
import sys
from orca_browser import Browser

b = Browser(sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173/', 'Port tuning regression')

def curve():
    return b.evaluate("document.querySelector('svg[aria-label=\"АЧХ фазоинвертора\"] path.stroke-orange-400').getAttribute('d')")

try:
    b.click('Фазоинвертор')
    before = curve()
    b.fill('Целевая Fb, Гц', 40)
    assert curve() != before, 'Changing target Fb did not change the response curve'
    assert abs(float(b.value('Длина порта Lv, см')) - 27.04) < 0.1
    b.fill('Длина порта Lv, см', 67.5)
    assert abs(float(b.value('Целевая Fb, Гц')) - 30) < 0.1
    b.fill('Целевая Fb, Гц', 40)
    b.fill('Vb (нетто), л', 80)
    assert abs(float(b.value('Длина порта Lv, см')) - 98.6) < 0.2
    b.fill('Целевая Fb, Гц', 500)
    assert not b.evaluate("!!document.querySelector('svg[aria-label=\"АЧХ фазоинвертора\"]')")
    assert 'Для такой Fb' in b.body()
    b.fill('Целевая Fb, Гц', 30)
    assert curve()
    b.select('Геометрическая модель порта', 'physical')
    assert curve()
    print('PASS: frequency, length, volume, impossible tuning, recovery and physical model')
finally:
    b.close()
