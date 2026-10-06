/** `npm run seed -w backend`: replaces all transactions with demo data. Uses `DB_PATH` like the server. */
import { defaultDbPath, openDb } from "./db.js";
import { generateSeed, localDate } from "./seed.js";
import { createTransactionsRepo } from "./transactions.repo.js";

const dbPath = defaultDbPath();
const today = localDate(new Date());
const items = generateSeed(today);

const db = openDb(dbPath);
try {
  const deleted = createTransactionsRepo(db).replaceAll(items);
  const months = [...new Set(items.map((t) => t.date.slice(0, 7)))];
  console.log(`Seeded ${dbPath}: deleted ${deleted} transaction(s), inserted ${items.length}`);
  console.log(`Months: ${months.join(", ")} (up to ${today})`);
} finally {
  db.close();
}
