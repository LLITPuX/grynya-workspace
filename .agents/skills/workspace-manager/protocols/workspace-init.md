# Протокол: Ініціалізація воркспейсу

## Призначення

Створення нового робочого простору з нуля. Виконується **один раз** при старті нового проєкту.

## Алгоритм

### Крок 1. Створити структуру каталогів

```
.agents/
├── skills/        — скіли агента
└── workflows/     — автоматизовані воркфлоу
```

### Крок 2. Створити кореневі файли

- `GEMINI.md` — правила агента (мова, конвенції, принцип сесій)
- `.gitignore` — ігнорування `node_modules/`, `.env`, Docker-каталогів, логів
- `README.md` — короткий опис воркспейсу

> [!IMPORTANT]
> Перше правило у `GEMINI.md` — **вся комунікація українською мовою** — має найвищий пріоритет і не може бути перевизначене.

### Крок 3. Ініціалізувати Git

```bash
git init
git checkout -b main
```

### Крок 4. Налаштувати Docker-оточення
Створити `Dockerfile` та `docker-compose.yml` в корені.

> [!TIP]
> Для коректної роботи Hot Reload на Windows, у секцію `environment` сервісів необхідно додати:
> ```yaml
> environment:
>   CHOKIDAR_USEPOLLING: "true"
>   WATCHPACK_POLLING: "true"
> ```

### Крок 5. Запустити середовище

```bash
docker compose up -d
```

### Крок 6. Налаштувати Інфраструктуру (Firecrawl & FalkorDB)

1. **Firecrawl**: Виконати `protocols/firecrawl-setup.md`.
2. **FalkorDB**: Виконати `protocols/falkordb-setup.md`.

### Крок 7. Первинна синхронізація Git-графа

Після того як FalkorDB запущено, необхідно побудувати початковий граф репозиторію:
```bash
node .agents/skills/workspace-manager/scripts/sync-git-init.js
```

### Крок 8. Перший коміт

```bash
git add .
git commit -m "feat: initialize workspace with docker isolation"
git push -u origin main
```

## Шаблон GEMINI.md

```markdown
# Grynya Workspace — Правила агента

## 🔴 Правило №1 (Найвищий пріоритет)
**Вся комунікація, документація, звіти, плани та міркування — строго УКРАЇНСЬКОЮ мовою.**
Виключення: commit messages, назви файлів і змінних — англійською.

## Принцип сесій
- Кожна робоча сесія фокусується на **одному наборі скілів**

## Конвенція скілів
- Усі скіли розміщуються у `.agents/skills/<skill-name>/`
- Кожен скіл ОБОВ'ЯЗКОВО має `SKILL.md` із YAML frontmatter

## Git-конвенції
- Основна гілка: `main`
- Commit messages: англійською, формат `type: short description`
```
