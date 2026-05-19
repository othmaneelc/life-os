const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join('C:\\life-os\\data\\lifeos.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  console.log('=== Tables ===');
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  if (tables.length > 0) {
    tables[0].values.forEach(function(row) { console.log('  ' + row[0]); });
  }
  
  console.log('');
  console.log('=== habit_logs rows ===');
  const rows = db.exec('SELECT * FROM habit_logs ORDER BY date DESC');
  if (rows.length > 0) {
    console.log('Columns: ' + rows[0].columns.join(', '));
    rows[0].values.forEach(function(row, i) {
      console.log('  Row ' + i + ': ' + JSON.stringify(row));
    });
  } else {
    console.log('  No rows found');
  }

  console.log('');
  console.log('=== Check note column values ===');
  const notes = db.exec("SELECT id, note FROM habit_logs WHERE note IS NOT NULL");
  if (notes.length > 0) {
    notes[0].values.forEach(function(row) {
      console.log('  id=' + row[0] + ' note=' + JSON.stringify(row[1]));
    });
  } else {
    console.log('  No rows with non-null note');
  }
  
  console.log('');
  console.log('=== Row count ===');
  const count = db.exec('SELECT COUNT(*) as cnt FROM habit_logs');
  if (count.length > 0) {
    console.log('  Total habit_logs rows: ' + count[0].values[0][0]);
  }
  
  db.close();
}
main().catch(console.error);
