const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// SQLite database file path
const dbPath = path.join(__dirname, '..', 'database', 'once_human_memetics.db');

// Also clear uploaded profile images
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');

console.log('데이터베이스 초기화를 시작합니다...');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('데이터베이스 연결 오류:', err.message);
    process.exit(1);
  } else {
    console.log('데이터베이스에 연결되었습니다');
    clearAllData();
  }
});

function clearAllData() {
  db.serialize(() => {
    // Delete all data from tables (in correct order due to foreign keys)
    const tables = [
      'clan_join_requests',
      'memetics',
      'clan_members',
      'characters',
      'clans',
      'users'
    ];

    let completed = 0;
    tables.forEach((table) => {
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err) {
          console.error(`${table} 테이블 삭제 오류:`, err.message);
        } else {
          console.log(`✓ ${table} 테이블의 모든 데이터가 삭제되었습니다`);
        }
        completed++;

        if (completed === tables.length) {
          // Reset auto-increment counters
          resetAutoIncrement();
        }
      });
    });
  });
}

function resetAutoIncrement() {
  db.serialize(() => {
    db.run(`DELETE FROM sqlite_sequence`, (err) => {
      if (err) {
        console.error('Auto-increment 초기화 오류:', err.message);
      } else {
        console.log('✓ Auto-increment 카운터가 초기화되었습니다');
      }

      // Clear profile images
      clearProfileImages();
    });
  });
}

function clearProfileImages() {
  if (fs.existsSync(uploadsDir)) {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        console.error('프로필 이미지 디렉토리 읽기 오류:', err.message);
        closeDatabase();
        return;
      }

      if (files.length === 0) {
        console.log('삭제할 프로필 이미지가 없습니다');
        closeDatabase();
        return;
      }

      let deletedCount = 0;
      files.forEach((file) => {
        const filePath = path.join(uploadsDir, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`${file} 삭제 오류:`, err.message);
          } else {
            deletedCount++;
          }

          if (deletedCount === files.length) {
            console.log(`✓ ${deletedCount}개의 프로필 이미지가 삭제되었습니다`);
            closeDatabase();
          }
        });
      });
    });
  } else {
    console.log('프로필 이미지 디렉토리가 존재하지 않습니다');
    closeDatabase();
  }
}

function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('데이터베이스 종료 오류:', err.message);
    } else {
      console.log('\n=================================');
      console.log('데이터베이스 초기화가 완료되었습니다!');
      console.log('=================================\n');
    }
  });
}
