# Протокол Git-синхронізації (Git-Sync Protocol)

Цей протокол описує процес синхронізації стану Git-репозиторію з графовою базою FalkorDB.

## 1. Ініціалізація (Init)
Використовується для першого наповнення графа або повного перерахунку.

**Команда:**
```powershell
node .agents/skills/workspace-manager/scripts/sync-git-init.js > /tmp/init.cypher
# Виконати вміст /tmp/init.cypher у FalkorDB
```

## 2. Інкрементальне оновлення (Update)
Використовується для додавання нових коммітів після `git commit` або `git pull`.

**Команда:**
```powershell
node .agents/skills/workspace-manager/scripts/sync-git-update.js
```

## 3. Схема Графа
- Вузли `Folder` та `File` ідентифікуються за атрибутом `path` (внутрішній ID).
- Для користувача шлях відображається через ієрархію `CONTAINS`.
- Темпоральна сітка: `Year -> Month -> Day -> Commit`.
