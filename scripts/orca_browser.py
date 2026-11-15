"""Small Orca browser-test helper. Each run gets an isolated local profile."""
import json
import os
import subprocess
import time


class Browser:
    def __init__(self, url, label="TBox checks"):
        self.orca = os.environ.get("ORCA_CLI_COMMAND", "orca-ide")
        self.profile = self.call("tab", "profile", "create", "--label", f"{label} {time.time_ns()}", "--scope", "isolated")["profile"]["id"]
        self.page = self.call("tab", "create", "--url", url, "--profile", self.profile)["browserPageId"]
        self.command("wait", "--selector", "main b")
        self.command("capture", "start")

    def call(self, *args):
        result = subprocess.run([self.orca, *args, "--json"], capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise RuntimeError(f"Orca {args[0]} failed: {result.stderr or result.stdout}")
        response = json.loads(result.stdout)
        if not response.get("ok"):
            raise RuntimeError(response)
        return response["result"]

    def command(self, *args):
        return self.call(*args, "--page", self.page)

    def evaluate(self, expression):
        result = self.command("eval", "--expression", "JSON.stringify(" + expression + ")")
        raw = result.get("result")
        return None if raw in (None, "", "undefined") else json.loads(raw)

    def control(self, role, name):
        refs = self.command("snapshot", "--interactive")["refs"]
        matches = ["@" + key for key, v in refs.items() if v.get("role") == role and (v.get("name") == name or v.get("name", "").startswith(name))]
        assert len(matches) == 1, (role, name, matches)
        return matches[0]

    def click(self, name):
        self.command("click", "--element", self.control("button", name))

    def fill(self, name, value):
        self.command("fill", "--element", self.control("spinbutton", name), "--value", str(value))

    def select(self, name, value):
        self.command("select", "--element", self.control("combobox", name), "--value", str(value))

    def check(self, name, checked=True):
        self.command("check" if checked else "uncheck", "--element", self.control("checkbox", name))

    def value(self, name):
        return self.evaluate("[...document.querySelectorAll('input')].find(x=>x.getClientRects().length && x.getAttribute('aria-label')===" + json.dumps(name) + ").value")

    def body(self):
        return self.evaluate("document.body.innerText")

    def metrics(self):
        return self.evaluate("[...document.querySelectorAll('[aria-label=\"Акустические метрики\"] b')].filter(x=>x.getClientRects().length).map(x=>x.textContent)")

    def reload(self):
        self.command("reload")
        self.command("wait", "--selector", "h1")

    def close(self):
        self.command("tab", "close")
        self.call("tab", "profile", "delete", "--profile", self.profile)
