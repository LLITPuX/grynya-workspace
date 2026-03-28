# Протокол: Управління MCP серверами

## Призначення
Регламентація роботи з MCP (Model Context Protocol) серверами: додавання, оновлення конфігурації та синхронізація зі станом Docker.

## Основний скрипт
Усі зміни станів (disabled: true/false) та синхронізація URL-адрес виконуються за допомогою:
```bash
node .agents/skills/workspace-manager/scripts/update-mcp-config.js
```

## Алгоритм додавання нового сервера

1. **Підготувати інфраструктуру**: 
   - Якщо сервер потребує окремого контейнера — додати його у `docker-compose.yml`.
   - Запустити контейнер: `docker compose up -d`.

2. **Зареєструвати в mcp_config.json**:
   Додати нову секцію у файл `C:\Users\Admin\.gemini\antigravity\mcp_config.json`.
   
   Приклад для `docker exec`:
   ```json
   "new-server": {
     "command": "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
     "args": ["exec", "-i", "container-name", "python", "-u", "main.py"],
     "env": {}
   }
   ```

3. **Синхронізувати**:
   Запустити скрипт `update-mcp-config.js`. Переконатися, що він знайшов новий контейнер і встановив правильний статус.

4. **Перевірити в IDE**:
   Gemini автоматично підвантажить зміни. Якщо ні — перезавантажте MCP сервери у налаштуваннях.

> [!IMPORTANT]
> Завжди використовуйте абсолютні шляхи до `docker.exe` на Windows та прапорець `-i` для stdio-транспорту.
