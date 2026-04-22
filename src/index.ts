export * from "./core/app-core";
export * from "./core/types/config";
export * from "./kadmium-app";
export * from "./schema/init";
export * from "./controller/init";
export * from "./validation";
export * from "./route/adapters/rest.adapter";
export * from "./sqb/adapters/postgres";

// Auth module exports
export * from "./auth";

// Re-export commonly used types
export type { Schema } from "./schema/engine/schema";
export type { ControllerInstance } from "./controller/types/controller";
export type { IRouteAdapter } from "./route/types/adapter";
export type { DbConfig } from "./sqb/types/config";
export type {
  AppConfig,
  ClusterNodeConfig,
  GenConfig,
} from "./core/types/config";

// Default export for convenience
import { Kadmium } from "./kadmium-app";
export default Kadmium;
