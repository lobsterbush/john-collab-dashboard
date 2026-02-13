import fs from 'fs';
import path from 'path';

const csvPath = path.resolve(process.cwd(), 'data/projects.csv');
const jsonPath = path.resolve(process.cwd(), 'data/projects.json');

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function main() {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',');

  const projects = lines.map(line => parseCSVRow(line)).filter(cells => cells.length > 1).map(cells => ({
    timestamp: cells[0] || '',
    title: cells[1] || '',
    abstract: cells[2] || '',
    status: cells[3] || '',
    submissionDate: cells[4] || '',
    targetJournal: cells[5] || '',
    priority: cells[6] || '',
    deadline: cells[7] || '',
    irbStatus: cells[8] || '',
    funding: cells[9] || '',
    docsLink: cells[10] || '',
    coauthors: cells[11] || '',
    keywords: cells[12] || '',
    lastActivity: cells[13] || ''
  }));

  fs.writeFileSync(jsonPath, JSON.stringify({ updated: new Date().toISOString(), count: projects.length, projects }, null, 2));
  console.log(`Wrote ${projects.length} projects to ${path.relative(process.cwd(), jsonPath)}`);
}

main();
