export function kebabCase(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const defaultLogger = {
  info: (_message: unknown) => {
    // No-op for default logger
  },
  error: (_message: unknown) => {
    // No-op for default logger
  },
};
