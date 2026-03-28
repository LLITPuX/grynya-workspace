---
name: workspace-manager
description: Управління робочим простором — ініціалізація, встановлення Firecrawl MCP, створення скілів.
---

# Workspace Manager

Скіл для управління інфраструктурою робочого простору Grynya.

## Протоколи

| Протокол | Файл | Коли застосовувати |
|----------|------|--------------------|
| Ініціалізація воркспейсу | `protocols/workspace-init.md` | Створення нового проєкту з нуля (Docker, Git) |
| Встановлення Firecrawl | `protocols/firecrawl-setup.md` | Потрібен локальний MCP-сервер для веб-скрапінгу |
| Створення скілів | `protocols/create-skill.md` | Додавання нового скілу до воркспейсу |
| Відкриття сесії | `protocols/session-open.md` | Отримання контексту та оновлення MCP-конфігу |
| Закриття сесії | `protocols/session-close.md` | Фіксація досвіду та аудит документації |
| Управління MCP | `protocols/mcp-management.md` | Додавання/оновлення MCP серверів |
| Середовище розробки | `protocols/dev-environment.md` | Hot Reload, поллінг на Windows, Bind Mounts |
| Обслуговування | `protocols/infrastructure-maintenance.md` | Healthcheck контейнерів, очищення логів |

## Як використовувати

1. Визнач, який протокол потрібен із таблиці вище
2. Завантаж **лише** відповідний файл із `protocols/`
3. Виконуй кроки послідовно
4. Записуй помилки та рішення у `logs/`

## Допоміжні файли

| Файл | Призначення |
|------|-------------|
| `scripts/scaffold-skill.js` | Створює структуру нового скілу |
| `scripts/session-log.js` | Автоматизує відкриття/закриття сесій |
| `scripts/update-mcp-config.js` | Синхронізує mcp_config.json з Docker |
| `examples/skill-template.md` | Шаблон SKILL.md для нових скілів |
| `resources/self_host_firecrawl.md` | Довідник з self-hosting Firecrawl |
