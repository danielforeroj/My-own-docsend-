export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getEnv(name: string): string {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}
