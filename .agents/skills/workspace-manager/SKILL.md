---
name: workspace-manager
description: Управління робочим простором — ініціалізація, встановлення Firecrawl MCP, створення скілів.
---

# Workspace Manager

Єдиний скіл для управління інфраструктурою робочого простору Grynya. Містить три протоколи, кожен із яких вирішує окреме завдання.

---

## Протокол 1: Ініціалізація воркспейсу

### Призначення
Створення нового робочого простору з нуля. Використовується один раз при старті нового проєкту.

### Алгоритм

1. **Створити структуру каталогів:**
   ```
   .agents/skills/       — скіли агента
   .agents/workflows/    — воркфлоу
   ```

2. **Створити кореневі файли:**
   - `GEMINI.md` — правила агента (мова, конвенції, принцип сесій)
   - `.gitignore` — ігнорування node_modules, .env, Docker-каталогів, логів
   - `README.md` — короткий опис воркспейсу

3. **Ініціалізувати Git:**
   ```bash
   git init
   git checkout -b main
   ```

4. **Створити GitHub-репозиторій** (через GitHub MCP або `gh cli`):
   ```bash
   gh repo create <repo-name> --public --source=. --remote=origin --push
   ```

5. **Перший коміт:**
   ```bash
   git add .
   git commit -m "feat: initialize workspace structure"
   git push -u origin main
   ```

### Важливі правила для GEMINI.md
> [!IMPORTANT]
> Перше правило у `GEMINI.md` — **вся комунікація українською мовою** — має найвищий пріоритет і не може бути перевизначене.

---

## Протокол 2: Встановлення Firecrawl MCP

### Призначення
Розгортання локальної open-source версії Firecrawl через Docker та підключення як MCP-сервера.

### Передумови
- Docker Desktop запущений
- Порт 3002 вільний

### Алгоритм

1. **Створити batch-файл** `start_firecrawl.bat` у корені воркспейсу.

   > [!CAUTION]
   > Використовуйте ТІЛЬКИ ASCII-символи у `echo` — стандартний Windows CMD (CP866) ламається від кирилиці!

   ```bat
   @echo off
   echo Starting Firecrawl Server Locally...
   cd /d "%~dp0"
   IF NOT EXIST "firecrawl-local" ( git clone https://github.com/mendableai/firecrawl.git firecrawl-local )
   cd firecrawl-local
   IF EXIST "apps\api\.env.example" IF NOT EXIST "apps\api\.env" ( copy apps\api\.env.example apps\api\.env )
   docker compose up -d
   ```

2. **Ручний запуск** — попросити користувача запустити `.bat` файл (уникайте `run_command` для цього).

3. **Налаштування MCP** — додати блок у `c:\Users\admin\.gemini\antigravity\mcp_config.json`:
   ```json
   "firecrawl-local": {
     "command": "npx",
     "args": ["-y", "firecrawl-mcp"],
     "env": {
       "FIRECRAWL_API_URL": "http://localhost:3002",
       "FIRECRAWL_API_KEY": "local-test-key"
     }
   }
   ```

4. **Завершення** — попросити користувача перезапустити агент або оновити MCP.

### Довідка
Детальна документація з самостійного хостингу: `resources/self_host_firecrawl.md`

---

## Протокол 3: Створення скілів

### Призначення
Покроковий процес створення нових стандартних скілів для агента.

### Фаза 1: Збір вимог

Перевірте, чи користувач надав достатньо деталей:
- **Мета скілу** — що саме скіл повинен робити?
- **Файли/структури** — з якими файлами чи проєктами скіл взаємодіє?
- **Назва** — запропонуйте ім'я у форматі `kebab-case`

Якщо деталей не вистачає — ЗУПИНІТЬСЯ та запитайте.

### Фаза 2: Симуляція

Перед генерацією файлів:
1. Прослідкуйте кроки виконання подумки
2. Визначте потенційні edge cases
3. Оновіть план на основі знахідок
4. Отримайте підтвердження від користувача

### Фаза 3: Генерація

1. **Цільова директорія**: `.agents/skills/<skill-name>/`
2. **Обов'язкова структура:**
   - `SKILL.md` — головний файл із YAML frontmatter
   - `scripts/` — допоміжні скрипти (рекомендовано)
   - `examples/` — приклади та шаблони (рекомендовано)
3. **Шаблон**: використовуйте `examples/skill-template.md` як основу
4. **Валідація**: після генерації ОБОВ'ЯЗКОВО запустити:
   ```bash
   node .agents/skills/workspace-manager/scripts/verify-structure.js <path-to-skill>
   ```

### Правила для SKILL.md
- Чіткі markdown-секції
- Checklist-стиль для багатокрокових задач
- Для складних скілів — використовуйте `task_boundary`

---

## Файли скілу

| Файл | Призначення |
|------|-------------|
| `scripts/verify-structure.js` | Валідація структури SKILL.md |
| `examples/skill-template.md` | Шаблон для нових скілів |
| `resources/self_host_firecrawl.md` | Документація Firecrawl self-hosting |
