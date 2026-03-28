const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GRAPH = 'git_stream';
const JOURNAL_PATH = path.resolve(__dirname, '..', 'logs', 'journal.json');

function runQuery(cypher) {
    const res = spawnSync('docker', ['exec', 'falkordb', 'redis-cli', 'graph.query', GRAPH, cypher], {
        encoding: 'utf8'
    });
    return res;
}

let journalPath = path.resolve(__dirname, '..', 'logs', 'journal.json');
if (!fs.existsSync(journalPath)) {
    journalPath = journalPath + '.bak';
}

if (!fs.existsSync(journalPath)) {
    console.error("❌ journal.json (або .bak) не знайдено.");
    process.exit(1);
}

const journalData = fs.readFileSync(journalPath, 'utf8');
const escapedData = journalData.replace(/"/g, "'").replace(/'/g, "\\'");

console.log("⏳ Міграція journal.json у FalkorDB...");

const query = `CREATE (l:LegacyLogs {
    name: 'journal.json',
    description: 'Старі логи сесій до переходу на унікальні файли',
    content: "${escapedData}"
})`;

const res = runQuery(query);

if (res.status === 0) {
    console.log("✅ Успішно створено вузол :LegacyLogs.");
    // Можна було б видалити файл, але користувач просив "не видаляти ні в якому разі" (хоча казав "в базі зберегти").
    // Я залишу його для безпеки, або перейменую в .bak
    fs.renameSync(JOURNAL_PATH, JOURNAL_PATH + '.bak');
    console.log("📦 journal.json перейменовано у journal.json.bak");
} else {
    console.error("❌ Помилка при створенні вузла:", res.stdout || res.stderr);
}
