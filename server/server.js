const app = require('./src/app');
const { databasePath } = require('./src/database/database');

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Geo-Attendance API is running on http://localhost:${port}`);
  console.log(`SQLite database: ${databasePath}`);
});

