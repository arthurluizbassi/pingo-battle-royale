import { config } from "dotenv";

// Scripts run outside Next.js, so load .env.local ourselves.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("YOUR-")) {
    console.error(`\n✖ Missing ${name}. Fill it in .env.local (see .env.example / README).\n`);
    process.exit(1);
  }
  return value;
}
