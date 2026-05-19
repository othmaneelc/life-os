const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = 'C:\\life-os\\data\\lifeos.db';
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  console.log('=== habits table ===');
  const habits = db.exec('SELECT * FROM habits');
  if (habits.length > 0) {
    console.log('Columns: ' + habits[0].columns.join(', '));
    habits[0].values.forEach(function(row, i) {
      console.log('  Habit ' + i + ': ' + JSON.stringify(row));
    });
  } else {
    console.log('  No habits found');
  }

  console.log('');
  console.log('=== Join test: habits left join habit_logs for month 2026-05 ===');
  const joinResult = db.exec("SELECT h.id, h.name, hl.id as log_id, hl.date, hl.done FROM habits h LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date >= '2026-05-01' AND hl.date <= '2026-05-31' WHERE h.active = 1 ORDER BY h.sort_order");
  if (joinResult.length > 0) {
    console.log('Columns: ' + joinResult[0].columns.join(', '));
    joinResult[0].values.forEach(function(row, i) {
      console.log('  Row ' + i + ': ' + JSON.stringify(row));
    });
  } else {
    console.log('  No results');
  }

  // Simulate the /month endpoint query
  console.log('');
  console.log('=== Simulated /month endpoint query for 2026-05 ===');
  const monthLogs = db.exec("SELECT * FROM habit_logs WHERE date >= '2026-05-01' AND date <= '2026-05-31'");
  if (monthLogs.length > 0) {
    console.log('Found ' + monthLogs[0].values.length + ' rows');
    monthLogs[0].values.forEach(function(row, i) {
      console.log('  Row ' + i + ': ' + JSON.stringify(row));
    });
    // Check JSON serialization
    console.log('');
    console.log('=== JSON serialization test ===');
    try {
      const json = JSON.stringify(monthLogs[0].values);
      console.log('JSON serialization OK, length: ' + json.length);
    } catch(e) {
      console.log('JSON SERIALIZATION FAILED: ' + e.message);
    }
  } else {
    console.log('No rows found for May 2026');
  }
  
  db.close();
}
main().catch(console.error);
