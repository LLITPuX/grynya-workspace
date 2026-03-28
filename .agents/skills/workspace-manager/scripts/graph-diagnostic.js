const { spawnSync } = require('child_process');

const REPO_NAME = 'grynya-workspace';
const GRAPH = 'git_stream';

function runQuery(cypher) {
    const res = spawnSync('docker', ['exec', 'falkordb', 'redis-cli', 'graph.query', GRAPH, cypher], {
        encoding: 'utf8'
    });
    if (res.status !== 0) {
        return { error: true, msg: res.stderr || res.stdout || 'Невідома помилка Docker/FalkorDB' };
    }
    const out = res.stdout.trim();
    if (out.includes('errMsg')) {
        return { error: true, msg: out };
    }
    return { error: false, data: out };
}

function checkDocker() {
    console.log(`\n🔍 ПЕРЕВІРКА КОНТЕЙНЕРА...`);
    const res = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', 'falkordb'], {
        encoding: 'utf8'
    });
    if (res.status !== 0 || res.stdout.trim() !== 'true') {
        console.error(`❌ Контейнер 'falkordb' не запущений.`);
        process.exit(1);
    }
    console.log(`✅ Контейнер 'falkordb' працює.`);
}

function checkPing() {
    const res = spawnSync('docker', ['exec', 'falkordb', 'redis-cli', 'ping'], {
        encoding: 'utf8'
    });
    if (res.stdout.trim() !== 'PONG') {
        console.error(`❌ FalkorDB не відповідає на PING.`);
        process.exit(1);
    }
    console.log(`✅ FalkorDB активний (PONG).`);
}

function getStats() {
    console.log(`\n📊 СТАТИСТИКА ГРАФА [${GRAPH}]:`);
    
    // Кількість вузлів
    const nodeQuery = "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count";
    const nodeRes = runQuery(nodeQuery);
    if (nodeRes.error) {
        console.error(`❌ Помилка при отриманні вузлів: ${nodeRes.msg}`);
    } else {
        console.log(`  🔹 Вузли:`);
        const lines = nodeRes.data.split('\n').map(l => l.trim()).filter(l => l !== '' && !l.includes('internal execution time') && !l.includes('Cached execution'));
        // Пропускаємо заголовки (label, count) та виводимо пари
        for (let i = 2; i < lines.length; i += 2) {
            if (lines[i] && lines[i+1]) {
                console.log(`     - ${lines[i]}: ${lines[i+1]}`);
            }
        }
    }

    // Кількість ребер
    const relQuery = "MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count";
    const relRes = runQuery(relQuery);
    if (relRes.error) {
        console.error(`❌ Помилка при отриманні зв'язків: ${relRes.msg}`);
    } else {
        console.log(`  🔹 Зв'язки:`);
        const lines = relRes.data.split('\n').map(l => l.trim()).filter(l => l !== '' && !l.includes('internal execution time') && !l.includes('Cached execution'));
        for (let i = 2; i < lines.length; i += 2) {
            if (lines[i] && lines[i+1]) {
                console.log(`     - ${lines[i]}: ${lines[i+1]}`);
            }
        }
    }
}

function checkIntegrity() {
    console.log(`\n🛠️ ПЕРЕВІРКА ЦІЛІСНОСТИ (СИРІТСТВО):`);
    let issuesFound = 0;

    const getDataLines = (res) => {
        if (res.error) return [];
        return res.data.split('\n')
            .map(l => l.trim())
            .filter(l => l !== '' && !l.includes('internal execution time') && !l.includes('Cached execution'));
    };

    // 1. Файли без батьків
    const orphanFilesRes = runQuery(`MATCH (f:File) WHERE NOT ()-[:CONTAINS]->(f) RETURN f.path`);
    const orphanFiles = getDataLines(orphanFilesRes);
    if (orphanFiles.length > 1) {
        console.warn(`⚠️  Знайдено файли без батьківських папок:`);
        orphanFiles.slice(1).forEach(l => console.warn(`     - ${l}`));
        issuesFound++;
    }

    // 2. Папки без батьків (крім кореневої)
    const orphanFoldersRes = runQuery(`MATCH (f:Folder) WHERE NOT ()-[:CONTAINS]->(f) AND f.path <> '${REPO_NAME}' RETURN f.path`);
    const orphanFolders = getDataLines(orphanFoldersRes);
    if (orphanFolders.length > 1) {
        console.warn(`⚠️  Знайдено папки без батьків:`);
        orphanFolders.slice(1).forEach(l => console.warn(`     - ${l}`));
        issuesFound++;
    }

    // 3. Комміти без прив'язки до файлів
    const orphanCommitsRes = runQuery(`MATCH (c:Commit) WHERE NOT (:File)-[:HAS_COMMIT]->(c) RETURN c.sha`);
    const orphanCommits = getDataLines(orphanCommitsRes);
    if (orphanCommits.length > 1) {
        console.warn(`⚠️  Знайдено комміти без прив'язки до файлів:`);
        orphanCommits.slice(1).forEach(l => console.warn(`     - ${l}`));
        issuesFound++;
    }

    // 4. Комміти без часової відмітки
    const ghostCommitsRes = runQuery(`MATCH (c:Commit) WHERE NOT (:Day)-[:AT]->(c) RETURN c.sha`);
    const ghostCommits = getDataLines(ghostCommitsRes);
    if (ghostCommits.length > 1) {
        console.warn(`⚠️  Знайдено комміти без часової відмітки (Day -> AT -> Commit):`);
        ghostCommits.slice(1).forEach(l => console.warn(`     - ${l}`));
        issuesFound++;
    }

    if (issuesFound === 0) {
        console.log(`✅ Проблем зі структурою не виявлено.`);
    } else {
        console.log(`\n💡 Порада: Якщо вузлів багато, спробуйте виконати повну ініціалізацію: node .agents/skills/workspace-manager/scripts/sync-git-init.js`);
    }
}

// Запуск
console.log(`🚀 ДІАГНОСТИКА ГРАФА GRYNYA 🚀`);
checkDocker();
checkPing();
getStats();
checkIntegrity();
console.log(`\n🏁 Діагностика завершена.`);
