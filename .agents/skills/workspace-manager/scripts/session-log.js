#!/usr/bin/env node

/**
 * session-log.js — Керування журналом сесій у скілах.
 * 
 * Використання:
 *   node session-log.js open <skill-name>                      — створити запис "В процесі"
 *   node session-log.js close <skill-name> "<короткий-звіт>"   — фіналізувати запис
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];
const skillName = args[1];
const summary = args[2] || "[Короткий підсумок робіт]";

if (!command || !skillName) {
  console.error('❌ Використання: node session-log.js <open|close> <skill-name> [summary]');
  process.exit(1);
}

const skillDir = path.resolve(__dirname, '..', '..', skillName); 
const journalPath = path.join(skillDir, 'logs', 'journal.json');

if (!fs.existsSync(skillDir)) {
  console.error(`❌ Скіл "${skillName}" не знайдено: ${skillDir}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(skillDir, 'logs'))) {
  fs.mkdirSync(path.join(skillDir, 'logs'), { recursive: true });
}

let journal = [];
if (fs.existsSync(journalPath)) {
  try {
    const data = fs.readFileSync(journalPath, 'utf8');
    journal = JSON.parse(data);
  } catch (e) {
    console.error(`⚠️ Помилка читання journal.json: ${e.message}`);
  }
}

// Поточний ID сесії (можна передавати через ENV)
const currentSessionId = process.env.SESSION_ID || "unknown";

if (command === 'open') {
  // Створюємо новий запис на початку сесії
  const newEntry = {
    date: new Date().toISOString(),
    session_id: currentSessionId,
    status: "В процесі",
    summary: summary !== "[Короткий підсумок робіт]" ? summary : "[Сесія розпочата]",
    docs_updated: "[В роботі]",
    errors: [],
    lessons: [],
    next_steps: []
  };
  
  journal.push(newEntry);
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');
  
  console.log(`\n📂 Сесію розпочато для "${skillName}".`);
  console.log(`📝 Запис створено у ${journalPath} зі статусом "В процесі".`);

} else if (command === 'close') {
  if (journal.length === 0) {
    console.error('❌ Журнал порожній. Спочатку запустіть "open".');
    process.exit(1);
  }

  // Шукаємо останній запис або запис з поточним ID
  let entry = journal.find(e => e.session_id === currentSessionId && e.status === "В процесі") 
             || journal[journal.length - 1];

  if (entry) {
    entry.status = "Завершено";
    entry.summary = summary;
    entry.date_closed = new Date().toISOString();
    
    // Якщо summary містить [RESET], ми можемо очистити lessons/errors для заповнення вручну
    // або залишити як є.
    
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');
    console.log(`\n✅ Сесію закрито для "${skillName}".`);
    console.log(`📊 Статус оновлено на "Завершено". Не забудьте перевірити lessons/errors в JSON.`);
  } else {
    console.error('❌ Не знайдено відкритої сесії для оновлення.');
  }
} else {
  console.error('❌ Невідома команда.');
  process.exit(1);
}
