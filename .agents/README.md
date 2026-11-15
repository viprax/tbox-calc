# Аудит Skills TBox — 2026-11-10
Новые skills установлены только в .agents/skills данного проекта. SKILL.md просмотрены до установки.
Источники: https://github.com/vercel-labs/agent-skills (composition-patterns, web-design-guidelines);
https://github.com/obra/superpowers (systematic-debugging, verification-before-completion, test-driven-development);
https://github.com/microsoft/playwright-cli (playwright-cli).
Ревизии просмотренных исходников записаны в sources.json.
Уже доступные глобальные frontend-design и vercel-react-best-practices не дублировались и не изменялись.
Новый Codex-сеанс из этой папки должен обнаружить .agents/skills; работоспособность динамического обнаружения в уже открытом сеансе не подтверждена.
Скиллы — Markdown-инструкции, не зависимости приложения. Поддержка allowed-tools в чужом формате не требуется: команды выполняются через доступный shell.

## Условия применения
React 19 / TS7 / Tailwind4 / Vite8 / Vitest5. Никаких Next.js/shadcn/RHF/Zod: зависимостей нет.
Отдельные TS/Tailwind/Vitest skills не добавлялись из непроверенных коллекций; пользоваться официальными руководствами:
https://www.typescriptlang.org/docs/handbook/
https://tailwindcss.com/docs/
https://vitest.dev/guide/
Supabase пока отсутствует: официальный PostgreSQL-навык не соответствует frontend-only задаче; отложено до интеграции JS SDK.
Не загружать все skills одновременно. Условия TDD из запроса владельца приоритетнее категоричных требований upstream.

## Проверка
Шесть SKILL.md существуют, frontmatter name/description проверен.
Playwright CLI 0.1.23 запущен через pnpm dlx; браузер Chromium установлен в пользовательский кэш.
Команда: pnpm dlx @playwright/cli -s=tbox open http://localhost:5173 --config=.agents/playwright.json
Проверка реальным браузером: открыл https://tbox-calc-seven.vercel.app, title box-calc, snapshot получен.
package.json, lockfile и src при настройке не менялись.
Стабильная main: build проходит, 117 тестов проходят.
dev после объединения: build падает с TS18047 в src/pages/PortedBoxPage.tsx:88.
ESLint не запускается: typescript-eslint 8.72.1 несовместим с установленным TypeScript 7.0.2.
Исправление этих ошибок — отдельная задача, поскольку пользователь запретил менять приложение при настройке.

## Ветки и публикация
Только main и dev. main соответствует проверенному старому релизу 2dec68b; dev содержит новый интерфейс.
Лишний Vercel проект box-2d удалён. Preview tbox-calc снова защищены.
Стабильная main опубликована в tora24/tbox-calc, стандартный адрес https://tbox-calc-seven.vercel.app (HTTP 200 без авторизации).
Публичность сайта не означает разрешение менять код. Не выдавать пользователям токены и приглашения редакторов.
Новые skills/AGENTS находятся в рабочей копии dev, пока не закоммичены. Старый stash и локальные правки dev не удалены.
