const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function getDataLines(res) {
    if (res.error) return [];
    return res.data.split('\n')
        .map(l => l.trim())
        .filter(l => l !== '' && !l.includes('internal execution time') && !l.includes('Cached execution'));
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
        const lines = getDataLines(nodeRes);
        for (let i = 2; i < lines.length; i += 2) {
            if (lines[i] && lines[i+1]) {
                console.log(`     - ${lines[i]}: ${lines[i+1]}`);
            }
        }
    }
}

function checkIntegrity() {
    console.log(`\n🛠️ ПЕРЕВІРКА ЦІЛІСНОСТИ СТРУКТУРИ:`);
    let issuesFound = 0;

    // 1. Файли без батьків
    const orphanFiles = getDataLines(runQuery(`MATCH (f:File) WHERE NOT ()-[:CONTAINS]->(f) RETURN f.path`));
    if (orphanFiles.length > 1) {
        console.warn(`⚠️  Знайдено файли без батьківських папок (${orphanFiles.length-1})`);
        issuesFound++;
    }

    // 2. Комміти без прив'язки до файлів
    const orphanCommits = getDataLines(runQuery(`MATCH (c:Commit) WHERE NOT (:File)-[:HAS_COMMIT]->(c) RETURN c.sha`));
    if (orphanCommits.length > 1) {
        console.warn(`⚠️  Знайдено комміти без прив'язки до файлів (${orphanCommits.length-1})`);
        issuesFound++;
    }

    if (issuesFound === 0) console.log(`✅ Проблем зі структурою не виявлено.`);
}

function checkSessionIntegrity() {
    console.log(`\n📂 ПЕРЕВІРКА СЕСІЙ ТА ЛОГІВ:`);
    let issuesFound = 0;

    const skillsDir = path.resolve(__dirname, '..', '..');
    const skills = fs.readdirSync(skillsDir).filter(f => fs.lstatSync(path.join(skillsDir, f)).isDirectory() && !f.startsWith('.'));

    skills.forEach(skill => {
        const logsDir = path.join(skillsDir, skill, 'logs');
        if (fs.existsSync(logsDir)) {
            const sessions = fs.readdirSync(logsDir).filter(f => f.startsWith('session_') && f.endsWith('.json'));
            sessions.forEach(file => {
                const filePath = path.join(logsDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                if (data.status === 'Завершено') {
                    // 1. Перевірка заповнення шаблону
                    if (data.summary.includes('[') || data.summary === "") {
                        console.warn(`⚠️  [${skill}] Сесія ${file} має незаповнений summary.`);
                        issuesFound++;
                    }

                    // 2. Перевірка наявності в графі
                    const nodeRes = runQuery(`MATCH (c:Commit) WHERE c.message CONTAINS '${file}' RETURN c.sha`);
                    const nodes = getDataLines(nodeRes);
                    if (nodes.length <= 1) {
                        console.warn(`⚠️  [${skill}] Сесія ${file} не знайдена в FalkorDB (коміт відсутній).`);
                        issuesFound++;
                    } else {
                        const sha = nodes[1];
                        // 3. Перевірка наявності Summary для кожного файлу
                        if (data.files_changed) {
                            data.files_changed.forEach(fc => {
                                const sumRes = runQuery(`MATCH (c:Commit {sha: '${sha}'})-[:DETAILS]->(s:Summary {file: '${fc.file}'}) RETURN s.text`);
                                const sums = getDataLines(sumRes);
                                if (sums.length <= 1) {
                                    console.warn(`⚠️  [${skill}] Відсутній вузол Summary для файлу ${fc.file} у комміті ${sha}.`);
                                    issuesFound++;
                                } else if (sums[1].includes('[Автоматично додано]')) {
                                    console.warn(`ℹ️  [${skill}] Файл ${fc.file} має лише автоматичний опис. Бажано додати деталі.`);
                                }
                            });
                        }
                    }
                }
            });
        }
    });

    if (issuesFound === 0) {
        console.log(`✅ Всі закриті сесії коректно заповнені та синхронізовані.`);
    } else {
        console.log(`❌ Знайдено ${issuesFound} зауважень до логів сесій.`);
    }
}

// Запуск
console.log(`🚀 ДІАГНОСТИКА ГРАФА GRYNYA 🚀`);
checkDocker();
checkPing();
getStats();
checkIntegrity();
checkSessionIntegrity();
console.log(`\n🏁 Діагностика завершена.`);
