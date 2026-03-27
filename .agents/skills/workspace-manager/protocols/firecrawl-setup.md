# Протокол: Встановлення Firecrawl MCP

## Призначення

Розгортання локальної open-source версії Firecrawl через Docker та підключення як MCP-сервера.

## Передумови

- Docker Desktop запущений
- Порт 3002 вільний

## Алгоритм

### Крок 1. Створити batch-файл

Створити `start_firecrawl.bat` у корені воркспейсу.

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

### Крок 2. Ручний запуск

Попросити користувача запустити `.bat` файл власноруч.

> [!WARNING]
> Уникайте `run_command` для запуску Docker-команд — можливі проблеми з UI-підтвердженням.

### Крок 3. Налаштування MCP

Додати блок у `c:\Users\admin\.gemini\antigravity\mcp_config.json`:

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

> [!NOTE]
> У npm-реєстрі пакет називається `firecrawl-mcp`, а не `@mendableai/...`

### Крок 4. Завершення

Попросити користувача перезапустити агент або натиснути «Refresh» у налаштуваннях MCP.

## Довідка

Детальна технічна документація: `resources/self_host_firecrawl.md`
