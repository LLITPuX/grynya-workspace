const { execSync } = require('child_process');

const GRAPH = 'git_stream';

function getLatestCommitInGraph() {
    try {
        // Отримуємо останній SHA з бази (найсвіжіший за часом у графі)
        const output = execSync(`docker exec falkordb redis-cli graph.query ${GRAPH} "MATCH (y:Year)-[:MONTH]->(d:Day)-[:AT]->(c:Commit) RETURN c.sha ORDER BY y.value DESC, d.month DESC, d.value DESC LIMIT 1"`, { encoding: 'utf8' });
        const lines = output.split('\n').filter(l => l.trim() && !l.includes('internal execution time') && !l.includes('Cached execution') && !l.includes('c.sha'));
        if (lines.length > 0) {
            return lines[0].trim();
        }
    } catch (e) {
        console.error("// Помилка при отриманні SHA з FalkorDB:", e.message);
    }
    return null;
}

function syncIncremental() {
    const lastSha = getLatestCommitInGraph();
    if (!lastSha) {
        console.log("// Не вдалося знайти початковий комміт у графі. Запустіть sync-git-init.js");
        return;
    }

    try {
        const log = execSync(`git log ${lastSha}..HEAD --pretty=format:"%H|%ai|%s"`, { encoding: 'utf8' }).trim();
        if (!log) {
            console.log("// Нових коммітів не знайдено.");
            return;
        }

        const commits = log.split('\n').map(line => {
            const [sha, dateStr, msg] = line.split('|');
            const d = new Date(dateStr);
            return {
                sha,
                msg: msg.replace(/'/g, "\\'"),
                y: d.getFullYear(),
                m: d.getMonth() + 1,
                day: d.getDate(),
                t: d.toTimeString().split(' ')[0]
            };
        });

        // Формуємо UNWIND запит для кожного комміта (спрощено: один коміт може стосуватися багатьох файлів, 
        // але тут ми просто оновлюємо часову сітку та реєструємо комміт)
        const unwindData = JSON.stringify(commits).replace(/"/g, "'");
        const query = `UNWIND ${unwindData} AS row 
            MERGE (c:Commit {sha: row.sha}) SET c.message = row.msg 
            MERGE (y:Year {value: row.y}) 
            MERGE (day:Day {value: row.day, year: row.y, month: row.m}) 
            MERGE (y)-[:MONTH {number: row.m}]->(day) 
            MERGE (day)-[:AT {time: row.t}]->(c)`;

        execSync(`docker exec falkordb redis-cli graph.query ${GRAPH} "${query}"`);
        console.log(`// Оновлено графу новими коммітами: ${commits.length}`);

        // Важливо: для кожного комміта треба також оновити зв'язки з файлами (спрощено через git show)
        commits.forEach(c => {
            const filesOutput = execSync(`git show --name-only --pretty=format: ${c.sha}`, { encoding: 'utf8' }).trim();
            const files = filesOutput.split('\n').filter(f => f.trim());
            const filesData = JSON.stringify(files.map(f => ({ path: f, sha: c.sha }))).replace(/"/g, "'");
            const fileQuery = `UNWIND ${filesData} AS row MATCH (f:File {path: row.path}), (c:Commit {sha: row.sha}) MERGE (f)-[:HAS_COMMIT]->(c)`;
            execSync(`docker exec falkordb redis-cli graph.query ${GRAPH} "${fileQuery}"`);
        });

    } catch (e) {
        console.error("// Помилка при інкрементальній синхронізації:", e.message);
    }
}

syncIncremental();
