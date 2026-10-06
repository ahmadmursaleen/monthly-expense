import { createApp } from "./app.js";
import { openDb } from "./db.js";

const port = Number(process.env.PORT ?? 3001);
createApp(openDb()).listen(port, () => console.log(`API on http://localhost:${port}`));
