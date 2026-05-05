import { existsSync } from "fs";
import { join } from "path";

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Валидация имени сервиса (только латиница, цифры, дефис).
 */
export function validateServiceName(name: string): ValidationError | null {
  if (!name || name.trim().length === 0) {
    return { field: "name", message: "Имя сервиса не может быть пустым." };
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return {
      field: "name",
      message:
        "Имя сервиса должно начинаться с буквы и содержать только латиницу, цифры и дефис.",
    };
  }
  if (name.length > 32) {
    return {
      field: "name",
      message: "Имя сервиса не должно превышать 32 символа.",
    };
  }
  return null;
}

/**
 * Валидация порта (1–65535).
 */
export function validatePort(port: number | string): ValidationError | null {
  const num = typeof port === "string" ? parseInt(port, 10) : port;
  if (isNaN(num) || num < 1 || num > 65535) {
    return {
      field: "port",
      message: "Порт должен быть числом от 1 до 65535.",
    };
  }
  return null;
}

/**
 * Валидация доменного имени.
 */
export function validateDomain(domain: string): ValidationError | null {
  if (!domain || domain.trim().length === 0) {
    return { field: "domain", message: "Домен не может быть пустым." };
  }
  if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(domain)) {
    return {
      field: "domain",
      message: "Некорректный формат домена (например: kadmium.local).",
    };
  }
  return null;
}

/**
 * Валидация IP-адреса (IPv4).
 */
export function validateIp(ip: string): ValidationError | null {
  if (!ip || ip.trim().length === 0) {
    return { field: "ip", message: "IP-адрес не может быть пустым." };
  }
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return { field: "ip", message: "IP-адрес должен состоять из 4 октетов." };
  }
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      return {
        field: "ip",
        message: "Каждый октет IP-адреса должен быть от 0 до 255.",
      };
    }
  }
  return null;
}

/**
 * Проверяет, что директория пуста или не существует.
 */
export function validateEmptyDir(dir: string): ValidationError | null {
  if (existsSync(dir)) {
    const files = require("fs").readdirSync(dir);
    if (files.length > 0) {
      return {
        field: "dir",
        message: `Директория "${dir}" не пуста. Используйте --force для перезаписи.`,
      };
    }
  }
  return null;
}
