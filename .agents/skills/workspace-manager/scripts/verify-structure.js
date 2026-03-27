#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

console.log(`Verifying standard skill structure in: ${targetPath}`);

const skillMdPath = path.join(targetPath, 'SKILL.md');

// 1. Check if SKILL.md exists
if (!fs.existsSync(skillMdPath)) {
  console.error(`\n❌ Validation Failed: SKILL.md not found at ${skillMdPath}`);
  console.error('Every skill must have a primary SKILL.md file.');
  process.exit(1);
}

// 2. Read the file
const content = fs.readFileSync(skillMdPath, 'utf8');

// 3. Check for frontmatter
if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
  console.error('\n❌ Validation Failed: SKILL.md must start with YAML frontmatter (---).');
  process.exit(1);
}

// 4. Check for name inside frontmatter
const nameMatch = content.match(/^---[\r\n]+([\s\S]*?)---/m);
if (!nameMatch) {
  console.error('\n❌ Validation Failed: Could not find closing frontmatter (---).');
  process.exit(1);
}

const frontmatter = nameMatch[1];

if (!/name:\s*.+/m.test(frontmatter)) {
  console.error('\n❌ Validation Failed: SKILL.md is missing a valid `name:` inside the YAML frontmatter.');
  console.error('Example:');
  console.error('---');
  console.error('name: repository-analyzer');
  console.error('description: Analyzes repository components');
  console.error('---');
  process.exit(1);
}

// 5. Check for description inside frontmatter
if (!/description:\s*.+/m.test(frontmatter)) {
  console.error('\n❌ Validation Failed: SKILL.md is missing a valid `description:` inside the YAML frontmatter.');
  console.error('Example:');
  console.error('---');
  console.error('description: Analyzes repository components');
  console.error('---');
  process.exit(1);
}

console.log('\n✅ Validation Passed: The skill structure looks good!');
