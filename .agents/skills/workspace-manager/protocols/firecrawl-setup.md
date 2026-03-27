# Протокол: Встановлення Firecrawl MCP

## Призначення

Розгортання локальної open-source версії Firecrawl через Docker та підключення як MCP-сервера.

## Передумови

- Docker Desktop запущений
- Порт 3002 вільний

## Алгоритм

### Крок 1. Клонування репозиторію

Виконати команду у корені воркспейсу:
```powershell
git clone https://github.com/mendableai/firecrawl.git firecrawl-mcp
```

### Крок 2. Налаштування оточення

Перейти в директорію та підготувати `.env` файл:
```powershell
cd firecrawl-mcp
cp apps/api/.env.example apps/api/.env
```

### Крок 3. Запуск контейнерів

Запустити сервіси через Docker Compose:
```powershell
docker compose up -d
```

### Крок 4. Налаштування MCP

Додати або оновити блок у `c:\Users\admin\.gemini\antigravity\mcp_config.json`:

```json
"firecrawl-mcp": {
  "command": "npx",
  "args": ["-y", "firecrawl-mcp"],
  "env": {
    "FIRECRAWL_API_URL": "http://localhost:3002",
    "FIRECRAWL_API_KEY": "local-test-key"
  }
}
```

### Крок 5. Завершення

Натиснути «Refresh» у налаштуваннях MCP або перезапустити агент.

## Довідка

Детальна технічна документація: `resources/self_host_firecrawl.md`
