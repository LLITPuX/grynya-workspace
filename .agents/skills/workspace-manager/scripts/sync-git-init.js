const { execSync, spawnSync } = require('child_process');

const REPO_NAME = 'grynya-workspace';
const GRAPH = 'git_stream';

function toCypher(obj) {
    // Перетворює JSON-об'єкт або масив у формат Cypher мапи (ключі без лапок)
    return JSON.stringify(obj).replace(/"([^"]+)":/g, '$1:');
}

function runQuery(cypher) {
    const res = spawnSync('docker', ['exec', 'falkordb', 'redis-cli', 'graph.query', GRAPH, cypher], {
        encoding: 'utf8'
    });
    if (res.status !== 0) {
        console.error(`// СИСТЕМНА ПОМИЛКА [status ${res.status}]: ${res.stderr || res.stdout}`);
    } else {
        const out = res.stdout.trim();
        if (out.includes('errMsg')) {
            console.error(`// ПОМИЛКА БД: ${out}`);
        } else {
            console.log(`// ВІДПОВІДЬ: ${out.split('\n')[0]}`);
        }
    }
}

function getGitFiles() {
    return execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(f => f.trim() !== '');
}

function getFileHistory(filePath) {
    try {
        const output = execSync(`git log --pretty=format:"%H|%ai|%s" -- "${filePath}"`, { encoding: 'utf8' });
        return output.split('\n').filter(l => l.trim() !== '').map(line => {
            const [sha, dateStr, message] = line.split('|');
            const date = new Date(dateStr);
            return {
                sha,
                message: message.replace(/"/g, "'").replace(/'/g, "\\'"), 
                y: date.getFullYear(),
                m: date.getMonth() + 1,
                day: date.getDate(),
                t: date.toTimeString().split(' ')[0]
            };
        });
    } catch (e) { return []; }
}

console.log(`// --- Очищення графа ---`);
runQuery("MATCH (n) DETACH DELETE n");

console.log(`// --- Ініціалізація репозиторію ---`);
runQuery(`MERGE (r:Repository {name: "${REPO_NAME}", path: "${REPO_NAME}"})`);

const files = getGitFiles();
const fileNodes = [];
const folderNodes = new Set();
const commits = [];

files.forEach(file => {
    const parts = file.split('/');
    let parentPath = REPO_NAME;
    
    parts.forEach((part, i) => {
        const isFile = (i === parts.length - 1);
        const currentPath = parts.slice(0, i + 1).join('/');
        
        if (isFile) {
            fileNodes.push({ name: part, path: currentPath, parent: parentPath });
            const history = getFileHistory(currentPath);
            history.forEach(c => commits.push({ ...c, file: currentPath }));
        } else {
            folderNodes.add(JSON.stringify({ name: part, path: currentPath, parent: parentPath }));
        }
        parentPath = currentPath;
    });
});

const folders = Array.from(folderNodes).map(f => JSON.parse(f));

console.log(`// --- Створення папок ---`);
const fBatch = 20;
for (let i = 0; i < folders.length; i += fBatch) {
    const batch = folders.slice(i, i + fBatch);
    const data = toCypher(batch);
    runQuery(`UNWIND ${data} AS row MERGE (f:Folder {path: row.path}) SET f.name = row.name`);
    runQuery(`UNWIND ${data} AS row MATCH (p {path: row.parent}), (f:Folder {path: row.path}) MERGE (p)-[:CONTAINS]->(f)`);
}

console.log(`// --- Створення файлів ---`);
for (let i = 0; i < fileNodes.length; i += fBatch) {
    const batch = fileNodes.slice(i, i + fBatch);
    const data = toCypher(batch);
    runQuery(`UNWIND ${data} AS row MATCH (p {path: row.parent}) MERGE (f:File {path: row.path}) SET f.name = row.name MERGE (p)-[:CONTAINS]->(f)`);
}

console.log(`// --- Створення коммітів та часової сітки (${commits.length}) ---`);
const cBatch = 10;
for (let i = 0; i < commits.length; i += cBatch) {
    const batch = commits.slice(i, i + cBatch);
    const data = toCypher(batch);
    const query = `UNWIND ${data} AS row 
        MATCH (f:File {path: row.file})
        MERGE (c:Commit {sha: row.sha}) SET c.message = row.message
        MERGE (f)-[:HAS_COMMIT]->(c)
        MERGE (y:Year {value: row.y})
        MERGE (day:Day {value: row.day, year: row.y, month: row.m})
        MERGE (y)-[:MONTH {number: row.m}]->(day)
        MERGE (day)-[:AT {time: row.t}]->(c)`;
    runQuery(query);
}

console.log("// --- Ініціалізація завершена успішно ---");
