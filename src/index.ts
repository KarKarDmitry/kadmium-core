export * from "./core/app-core.js";
export * from "./core/types/config.js";
export * from "./kadmium-app.js";
export * from "./schema/index.js";
export * from "./controller/init.js";
export * from "./validation/index.js";
export * from "./route/adapters/rest.adapter.js";
export * from "./sqb/adapters/postgres/index.js";

// Auth module exports
export * from "./auth/index.js";

// Re-export commonly used types
export type { Schema } from "./schema/engine/schema.js";
export type { ControllerInstance } from "./controller/types/controller.js";
export type { IRouteAdapter } from "./route/types/adapter.js";
export type { DbConfig } from "./sqb/types/config.js";
export type {
  AppConfig,
  ClusterNodeConfig,
  GenConfig,
} from "./core/types/config.js";

export { Kadmium, KadmiumApp, KadmiumConfig } from './kadmium-app.js'

// Default export for convenience
import { Kadmium } from "./kadmium-app.js";
export default Kadmium;
