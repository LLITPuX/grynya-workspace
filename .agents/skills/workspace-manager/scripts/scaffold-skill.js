#!/usr/bin/env node

/**
 * scaffold-skill.js — Детермінований генератор структури скілів.
 *
 * Використання:
 *   node scaffold-skill.js <skill-name>           — створити новий скіл
 *   node scaffold-skill.js --validate <path>       — перевірити існуючий скіл
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

// --- Режим валідації ---
if (args[0] === '--validate') {
  const targetPath = args[1] ? path.resolve(args[1]) : process.cwd();
  validateSkill(targetPath);
  process.exit(0);
}

// --- Режим створення ---
const skillName = args[0];

if (!skillName) {
  console.error('❌ Вкажіть назву скілу: node scaffold-skill.js <skill-name>');
  console.error('   або: node scaffold-skill.js --validate <path>');
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(skillName)) {
  console.error('❌ Назва скілу має бути у форматі kebab-case (лише a-z, 0-9, -)');
  process.exit(1);
}

const skillsRoot = path.resolve(__dirname, '..', '..', '..', 'skills');
const skillDir = path.join(skillsRoot, skillName);

if (fs.existsSync(skillDir)) {
  console.error(`❌ Скіл "${skillName}" вже існує: ${skillDir}`);
  process.exit(1);
}

// --- Структура каталогів ---
const dirs = [
  '',
  'protocols',
  'scripts',
  'examples',
  'resources',
  'logs',
];

dirs.forEach(dir => {
  fs.mkdirSync(path.join(skillDir, dir), { recursive: true });
});

// --- SKILL.md шаблон ---
const skillMd = `---
name: ${skillName}
description: [Короткий опис скілу — заповніть]
---

# ${capitalize(skillName)}

[Опис призначення скілу — заповніть]

## Протоколи

| Протокол | Файл | Коли застосовувати |
|----------|------|--------------------|
| [Назва] | \`protocols/[назва].md\` | [Умова] |

## Як використовувати

1. Визнач, який протокол потрібен із таблиці вище
2. Завантаж **лише** відповідний файл із \`protocols/\`
3. Виконуй кроки послідовно
4. Записуй помилки та рішення у \`logs/\`

## Допоміжні файли

| Файл | Призначення |
|------|-------------|
| — | [Додайте файли за потреби] |
`;

fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');

// --- .gitkeep для порожніх директорій ---
['protocols', 'scripts', 'examples', 'resources', 'logs'].forEach(dir => {
  const gitkeep = path.join(skillDir, dir, '.gitkeep');
  fs.writeFileSync(gitkeep, '', 'utf8');
});

console.log(`\n✅ Скіл "${skillName}" створено:`);
console.log(`   ${skillDir}/`);
console.log('');
console.log('   SKILL.md           — заповніть опис та протоколи');
console.log('   protocols/         — додайте файли протоколів');
console.log('   scripts/           — допоміжні скрипти');
console.log('   examples/          — приклади та шаблони');
console.log('   resources/         — довідкові матеріали');
console.log('   logs/              — логування досвіду');

// --- Функції ---

function capitalize(name) {
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function validateSkill(targetPath) {
  console.log(`Перевірка структури скілу: ${targetPath}`);

  const skillMdPath = path.join(targetPath, 'SKILL.md');

  if (!fs.existsSync(skillMdPath)) {
    console.error(`\n❌ SKILL.md не знайдено: ${skillMdPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');

  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    console.error('\n❌ SKILL.md має починатися з YAML frontmatter (---).');
    process.exit(1);
  }

  const fmMatch = content.match(/^---[\r\n]+([\s\S]*?)---/m);
  if (!fmMatch) {
    console.error('\n❌ Не знайдено закриваючий frontmatter (---).');
    process.exit(1);
  }

  const fm = fmMatch[1];
  if (!/name:\s*.+/m.test(fm)) {
    console.error('\n❌ Відсутнє поле `name:` у frontmatter.');
    process.exit(1);
  }
  if (!/description:\s*.+/m.test(fm)) {
    console.error('\n❌ Відсутнє поле `description:` у frontmatter.');
    process.exit(1);
  }

  // Перевірка каталогів
  const expectedDirs = ['protocols', 'logs'];
  const missing = expectedDirs.filter(d => !fs.existsSync(path.join(targetPath, d)));

  if (missing.length > 0) {
    console.warn(`\n⚠️  Відсутні каталоги: ${missing.join(', ')}`);
  }

  console.log('\n✅ Валідація пройшла!');
}
