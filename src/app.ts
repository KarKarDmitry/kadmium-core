import { Kadmium } from "./kadmium-app.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // ----------------------------
  // 0️⃣ Configure and start the application
  // ----------------------------
  Kadmium.configure({
    schemaSources: ["./src/example-schemas/*.schema.ts"],
    db: {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "kadmium",
      login: process.env.DB_LOGIN || "postgres",
      pass: process.env.DB_PASSWORD || "",
    },
  });

  await Kadmium.start();
  console.log("App configured and schemas registered.");

}

main().catch((err) => {
  console.error("\n\nFATAL ERROR:", err);
  process.exit(1);
});
