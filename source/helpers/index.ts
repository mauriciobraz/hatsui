export function raise(reason: string): never {
  throw new Error(reason);
}

export function getEnv(key: string): string {
  return process.env[key] || raise(`Missing environment variable "${key}"`);
}
