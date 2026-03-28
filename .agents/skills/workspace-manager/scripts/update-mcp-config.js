const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Шляхи до файлів
const configPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\mcp_config.json';

// Функція для отримання списку запущених контейнерів
function getRunningContainers() {
    try {
        const output = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
        return output.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    } catch (error) {
        console.error('❌ Помилка при виконанні docker ps:', error.message);
        return [];
    }
}

// Функція оновлення конфігурації
function updateConfig() {
    if (!fs.existsSync(configPath)) {
        console.error(`❌ Файл конфігурації не знайдено: ${configPath}`);
        return;
    }

    const runningContainers = getRunningContainers();
    console.log('🚢 Запущені контейнери:', runningContainers);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let changed = false;

    if (!config.mcpServers) return;

    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        // Визначаємо, який контейнер потрібен для цього сервера (базуючись на args або env)
        let requiredContainer = null;
        
        // Пошук у аргументах (наприклад, для docker exec)
        if (serverConfig.args) {
            // Шукаємо назви контейнерів у аргументах
            if (serverConfig.args.includes('falkor-db-mcp-server')) requiredContainer = 'falkor-db-mcp-server';
            else if (serverConfig.args.includes('subagent-mcp')) requiredContainer = 'subagent-mcp';
            else if (serverConfig.args.includes('grynya-workspace')) requiredContainer = 'grynya-workspace';
        }

        // Пошук у назві образу або через специфічні ключі (можна розширювати)
        if (serverName === 'firecrawl-mcp') {
             // firecrawl-mcp використовує firecrawl-api-1 всередині grynya-workspace
             requiredContainer = 'firecrawl-api-1'; 
        }

        if (requiredContainer) {
            const isRunning = runningContainers.includes(requiredContainer);
            const shouldBeDisabled = !isRunning;

            if (serverConfig.disabled !== shouldBeDisabled) {
                console.log(`🔄 Сервер [${serverName}]: зміна стану disabled -> ${shouldBeDisabled} (Контейнер ${requiredContainer} ${isRunning ? 'працює' : 'зупинений'})`);
                serverConfig.disabled = shouldBeDisabled;
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        console.log('✅ Конфігурацію оновлено успішно.');
    } else {
        console.log('ℹ️ Змін не виявлено. Конфігурація актуальна.');
    }
}

updateConfig();
