const { execSync } = require('child_process');
const fs = require('fs');

const REPO_NAME = 'grynya-workspace';

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
                message: message.replace(/'/g, "\\'").replace(/"/g, '\\"'),
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                time: date.toTimeString().split(' ')[0]
            };
        });
    } catch (e) { return []; }
}

const files = getGitFiles();
const fileNodes = [];
const folderNodes = new Set();
const relationships = [];
const commits = [];

// Побудова дерева
files.forEach(file => {
    const parts = file.split('/');
    let parentPath = REPO_NAME;
    
    parts.forEach((part, i) => {
        const isFile = (i === parts.length - 1);
        const currentPath = parts.slice(0, i + 1).join('/');
        
        if (isFile) {
            fileNodes.push({ name: part, path: currentPath, parent: parentPath });
            // Історія
            const history = getFileHistory(currentPath);
            history.forEach((c, idx) => {
                commits.push({ ...c, filePath: currentPath });
                if (idx > 0) {
                    // Зв'язок між коммітами (ланцюжок)
                    // (history[idx-1] -> history[idx]) - в git log вони йдуть від нових до старих
                }
            });
        } else {
            folderNodes.add(JSON.stringify({ name: part, path: currentPath, parent: parentPath }));
        }
        parentPath = currentPath;
    });
});

const folders = Array.from(folderNodes).map(f => JSON.parse(f));

console.log(`// --- INITIALIZATION ---`);
console.log(`MERGE (r:Repository {name: '${REPO_NAME}'})`);

// Вивід даних для UNWIND
console.log(`\n// --- FOLDERS ---`);
console.log(`UNWIND [${folders.map(f => `{name: '${f.name}', path: '${f.path}', parent: '${f.parent}'}`).join(', ')}] AS row`);
console.log(`MERGE (f:Folder {path: row.path}) SET f.name = row.name`);

// Зв'язки папок
console.log(`\n// --- FOLDER RELATIONS ---`);
console.log(`UNWIND [${folders.map(f => `{path: '${f.path}', parent: '${f.parent}'}`).join(', ')}] AS row`);
console.log(`MATCH (p {path: row.parent})`);
console.log(`MATCH (f:Folder {path: row.path})`);
console.log(`MERGE (p)-[:CONTAINS]->(f)`);

// Файли
console.log(`\n// --- FILES ---`);
console.log(`UNWIND [${fileNodes.map(f => `{name: '${f.name}', path: '${f.path}', parent: '${f.parent}'}`).join(', ')}] AS row`);
console.log(`MATCH (p {path: row.parent})`);
console.log(`MERGE (f:File {path: row.path}) SET f.name = row.name`);
console.log(`MERGE (p)-[:CONTAINS]->(f)`);

// Комміти та Час (Пакетно по 50 коммітів щоб не перевантажити)
for (let i = 0; i < commits.length; i += 50) {
    const batch = commits.slice(i, i + 50);
    console.log(`\n// --- COMMITS BATCH ${Math.floor(i/50) + 1} ---`);
    console.log(`UNWIND [${batch.map(c => `{sha: '${c.sha}', msg: '${c.message}', y: ${c.year}, m: ${c.month}, d: ${c.day}, t: '${c.time}', file: '${c.filePath}'}`).join(', ')}] AS row`);
    console.log(`MATCH (f:File {path: row.file})`);
    console.log(`MERGE (c:Commit {sha: row.sha}) SET c.message = row.msg`);
    console.log(`MERGE (f)-[:HAS_COMMIT]->(c)`);
    console.log(`MERGE (y:Year {value: row.y})`);
    console.log(`MERGE (day:Day {value: row.d, year: row.y, month: row.m})`); // Унікальність дня
    console.log(`MERGE (y)-[:MONTH {number: row.m}]->(day)`);
    console.log(`MERGE (day)-[:AT {time: row.t}]->(c)`);
}
