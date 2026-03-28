#!/usr/bin/env node

/**
 * audit-docs.js — Комплексний аудит документації воркспейсу
 *
 * Призначення:
 * - Перевірити, чи кожен скіл має правильну структуру (Ядро, Допоміжні, Стан).
 * - Звірити протоколи, описані в SKILL.md, з фактичними файлами в папці protocols/.
 * - Виявити файли без документації та застарілі посилання.
 */

const fs = require('fs');
const path = require('path');

const skillsRoot = path.resolve(__dirname, '..', '..');

console.log('🔍 Початок комплексного аудиту документації скілів...\n');

if (!fs.existsSync(skillsRoot)) {
  console.error(`❌ Директорія скілів не знайдена: ${skillsRoot}`);
  process.exit(1);
}

const skills = fs.readdirSync(skillsRoot, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

let hasErrors = false;
let hasWarnings = false;

skills.forEach(skillName => {
  console.log(`\n📦 Перевірка скілу: ${skillName}`);
  const skillDir = path.join(skillsRoot, skillName);
  const skillMdPath = path.join(skillDir, 'SKILL.md');

  // 1. Перевірка наявності SKILL.md
  if (!fs.existsSync(skillMdPath)) {
    console.error(`   ❌ Відсутній файл SKILL.md`);
    hasErrors = true;
    return;
  }

  const skillMdContent = fs.readFileSync(skillMdPath, 'utf8');

  // 2. Перевірка Frontmatter
  const fmMatch = skillMdContent.match(/^---[\r\n]+([\s\S]*?)---/m);
  if (!fmMatch) {
    console.error(`   ❌ Відсутній або неправильний YAML frontmatter у SKILL.md`);
    hasErrors = true;
  } else {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/name:\s*(.+)/);
    if (!nameMatch || nameMatch[1].trim() !== skillName) {
      console.error(`   ❌ Поле 'name' у frontmatter не збігається з назвою папки скілу (${skillName})`);
      hasErrors = true;
    }
  }

  // 3. Перевірка наявності необхідних директорій
  const expectedDirs = ['protocols', 'scripts', 'examples', 'resources', 'logs'];
  const missingDirs = expectedDirs.filter(d => !fs.existsSync(path.join(skillDir, d)));
  
  if (missingDirs.length > 0) {
    console.warn(`   ⚠️  Відсутні структурні директорії: ${missingDirs.join(', ')}`);
    hasWarnings = true;
  }

  // 4. Валідація протоколів
  const protocolsDir = path.join(skillDir, 'protocols');
  const documentedProtocols = new Set();
  
  // Парсинг таблиці протоколів з SKILL.md (шукаємо `protocols/name.md`)
  const protocolRegex = /`protocols\/([^`]+)\.md`/g;
  let match;
  while ((match = protocolRegex.exec(skillMdContent)) !== null) {
    documentedProtocols.add(`${match[1]}.md`);
  }

  if (fs.existsSync(protocolsDir)) {
    const actualProtocols = fs.readdirSync(protocolsDir).filter(f => f.endsWith('.md'));
    
    // Перевірка 4a: Чи всі задокументовані протоколи існують?
    documentedProtocols.forEach(proto => {
      if (!actualProtocols.includes(proto)) {
        console.error(`   ❌ Протокол задокументовано в SKILL.md, але файл не знайдено: protocols/${proto}`);
        hasErrors = true;
      }
    });

    // Перевірка 4b: Чи всі існуючі протоколи задокументовані?
    actualProtocols.forEach(proto => {
      if (!documentedProtocols.has(proto)) {
        console.warn(`   ⚠️  Знайдено файл протоколу, але його немає в таблиці SKILL.md: protocols/${proto}`);
        hasWarnings = true;
      }
    });
  } else {
    if (documentedProtocols.size > 0) {
      console.error(`   ❌ Папка protocols/ відсутня, але в SKILL.md описані протоколи.`);
      hasErrors = true;
    }
  }
});

console.log('\n========================================');
if (hasErrors) {
  console.log('🔴 Аудит завершено З ПОМИЛКАМИ. Будь ласка, виправте невідповідності.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('🟡 Аудит завершено успішно, АЛЕ Є ПОПЕРЕДЖЕННЯ. Перевірте лог вище.');
  process.exit(0);
} else {
  console.log('✅ Аудит завершено успішно! Вся документація консистентна.');
  process.exit(0);
}
