import { Kadmium } from "./kadmium-app.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // ----------------------------
  // 0️⃣ Configure and start the application
  // ----------------------------
  await Kadmium.setConfig()
  await Kadmium.start();
  console.log("App configured and schemas registered.");

}

main().catch((err) => {
  console.error("\n\nFATAL ERROR:", err);
  process.exit(1);
});
