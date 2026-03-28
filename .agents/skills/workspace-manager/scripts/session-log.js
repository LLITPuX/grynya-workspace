#!/usr/bin/env node

/**
 * session-log.js — Керування сесіями Grynya.
 * 
 * Використання:
 *   node session-log.js open <skill-name>                      — створити шаблон сесії
 *   node session-log.js close <skill-name> "<короткий-звіт>"   — фіналізувати, коміт, діагностика
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];
const skillName = args[1];
const summary = args[2] || "";

if (!command || !skillName) {
  console.error('❌ Використання: node session-log.js <open|close> <skill-name> [summary]');
  process.exit(1);
}

const skillDir = path.resolve(__dirname, '..', '..', skillName); 
const logsDir = path.join(skillDir, 'logs');
const currentSessionPointer = path.join(logsDir, '.current_session');

if (!fs.existsSync(skillDir)) {
  console.error(`❌ Скіл "${skillName}" не знайдено: ${skillDir}`);
  process.exit(1);
}

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
}

if (command === 'open') {
  const timestamp = getTimestamp();
  const filename = `session_${timestamp}.json`;
  const filePath = path.join(logsDir, filename);

  const template = {
    date_opened: new Date().toISOString(),
    skill: skillName,
    status: "В процесі",
    summary: "[Очікується заповнення при close]",
    files_changed: [],
    errors: [],
    lessons: [],
    next_steps: []
  };

  fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');
  fs.writeFileSync(currentSessionPointer, filename, 'utf8');

  console.log(`\n📂 Сесію відкрито для "${skillName}".`);
  console.log(`📝 Створено шаблон: logs/${filename}`);

} else if (command === 'close') {
  if (!fs.existsSync(currentSessionPointer)) {
    console.error('❌ Не знайдено активної сесії. Запустіть "open" спочатку.');
    process.exit(1);
  }

  const filename = fs.readFileSync(currentSessionPointer, 'utf8').trim();
  const filePath = path.join(logsDir, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл сесії ${filename} не знайдено.`);
    process.exit(1);
  }

  console.log(`\n🔒 Закриття сесії: ${filename}...`);

  const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Отримання змінених файлів через git status та об'єднання з існуючими
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const gitFiles = status.split('\n')
      .filter(line => line.trim())
      .map(line => line.slice(3).trim());

    // Зберігаємо ВСІ існуючі записи з JSON
    const mergedFiles = [...(sessionData.files_changed || [])];
    const existingFilesSet = new Set(mergedFiles.map(f => f.file));

    // Додаємо нові файли з Git, яких ще немає в списку
    gitFiles.forEach(file => {
      if (!existingFilesSet.has(file)) {
        mergedFiles.push({
          file: file,
          summary: "[Очікує на детальний опис]"
        });
      }
    });

    sessionData.files_changed = mergedFiles;
  } catch (e) {
    console.warn('⚠️ Не вдалося отримати статус Git.');
  }

  // 2. Оновлення даних
  sessionData.status = "Завершено";
  sessionData.date_closed = new Date().toISOString();
  sessionData.summary = summary || sessionData.summary;

  fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf8');
  console.log(`✅ Дані сесії оновлено.`);

  // 3. Git Commit
  try {
    console.log(`📦 Виконую коміт...`);
    execSync('git add .');
    const commitMsg = `feat: close session ${skillName} (${filename})`;
    execSync(`git commit -m "${commitMsg}"`);
    console.log(`✅ Коміт створено.`);
  } catch (e) {
    console.error(`❌ Помилка коміту: ${e.message}`);
  }

  // 4. Оновлення графа
  try {
    console.log(`🔄 Оновлюю граф...`);
    const syncScript = path.join(__dirname, 'sync-git-update.js');
    execSync(`node "${syncScript}"`);
    console.log(`✅ Граф оновлено.`);
  } catch (e) {
    console.error(`❌ Помилка синхронізації графа: ${e.message}`);
  }

  // 5. Діагностика
  try {
    console.log(`🔍 Запускаю діагностику...`);
    const diagScript = path.join(__dirname, 'graph-diagnostic.js');
    execSync(`node "${diagScript}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`❌ Діагностика виявила проблеми.`);
  }

  // Видаляємо покажчик на поточну сесію
  fs.unlinkSync(currentSessionPointer);

} else {
  console.error('❌ Невідома команда.');
  process.exit(1);
}
