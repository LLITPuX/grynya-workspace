#!/usr/bin/env node

/**
 * session-log.js — Керування журналом сесій у скілах.
 * 
 * Використання:
 *   node session-log.js open <skill-name>   — вивести останній запис
 *   node session-log.js close <skill-name>  — підготувати шаблон для нового запису
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];
const skillName = args[1];

if (!command || !skillName) {
  console.error('❌ Використання: node session-log.js <open|close> <skill-name>');
  process.exit(1);
}

const skillsRoot = path.resolve(__dirname, '..', '..', '..', 'skills');
// If we are running from inside workspace-manager, adjust path
// Current __dirname is c:\grynya_workspace\.agents\skills\workspace-manager\scripts
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
    console.error(`⚠️  Помилка читання journal.json: ${e.message}. Починаю новий.`);
  }
}

if (command === 'open') {
  if (journal.length === 0) {
    console.log(`ℹ️  Журнал для "${skillName}" порожній. Нова історія починається тут.`);
  } else {
    const lastEntry = journal[journal.length - 1];
    console.log(`\n📜 Останній запис від ${lastEntry.date}:`);
    console.log(JSON.stringify(lastEntry, null, 2));
  }
} else if (command === 'close') {
  const newEntry = {
    date: new Date().toISOString(),
    session_id: process.env.SESSION_ID || "unknown",
    status: "[В процесі / Завершено / Перервано]",
    summary: "[Короткий підсумок робіт]",
    errors: [],
    lessons: [
      {
        problem: "[Опис проблеми]",
        solution: "[Як виправили]"
      }
    ],
    next_steps: []
  };
  
  journal.push(newEntry);
  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');
  
  console.log(`\n✅ Шаблон для закриття сесії додано до ${journalPath}`);
  console.log('📝 Будь ласка, заповніть останній об\'єкт у JSON-файлі.');
} else {
  console.error('❌ Невідома команда. Використовуйте "open" або "close".');
  process.exit(1);
}
