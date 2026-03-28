# Протокол: Встановлення FalkorDB MCP

## Призначення

Розгортання локальної бази даних FalkorDB через Docker та підключення її як MCP-сервера для виконання графових запитів.

## Передумови

- Docker Desktop запущений
- Порт 6379 вільний
- Контейнер `grynya-workspace` запущений

## Алгоритм

### Крок 1. Оновлення Docker Compose

Додати сервіс `falkordb` у `docker-compose.yml` кореня воркспейсу:
```yaml
  falkordb:
    image: falkordb/falkordb-server:latest
    container_name: falkordb
    ports:
      - "6379:6379"
    networks:
      - grynya-network

  falkordb-browser:
    image: falkordb/falkordb-browser:latest
    container_name: falkordb-browser
    ports:
      - "3000:3000"
    environment:
      - FALKORDB_URL=redis://falkordb:6379
    depends_on:
      - falkordb
    networks:
      - grynya-network
```

### Крок 2. Запуск сервісу

Виконати команду:
```powershell
docker compose up -d falkordb
```

### Крок 3. Налаштування MCP

Додати блок у `c:\Users\admin\.gemini\antigravity\mcp_config.json`:

```json
"falkordb-mcp": {
  "command": "docker",
  "args": [
    "exec",
    "-i",
    "-e",
    "FALKORDB_HOST=falkordb",
    "-e",
    "FALKORDB_PORT=6379",
    "grynya-workspace",
    "npx",
    "-y",
    "@falkordb/mcpserver@latest"
  ],
  "env": {
    "FALKORDB_HOST": "falkordb",
    "FALKORDB_PORT": "6379"
  }
}
```

### Крок 4. Перевірка

1. Переконатися, що база відповідає:
```powershell
docker exec grynya-workspace redis-cli -h falkordb PING
```
2. У інтерфейсі агента перевірити наявність нових інструментів (наприклад, `query`).
3. Відкрити `http://127.0.0.1:3000` (або `localhost:3000`) у браузері.

## Довідка

Офіційний репозиторій: [falkordb-mcpserver](https://github.com/falkordb/falkordb-mcpserver)
