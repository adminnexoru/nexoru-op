// Supabase CLI creates its own Docker network, which ignores the daemon's {"ip": "127.0.0.1"}.
// Creating the network beforehand with host_binding_ipv4=127.0.0.1 keeps every published port
// (API, database, Studio) on this machine only (FR-033, research R1).
import { execFileSync } from "node:child_process";

const BINDING_OPTION = "com.docker.network.bridge.host_binding_ipv4";

export function ensureLocalOnlyNetwork(name: string): void {
  let binding: string | null;
  try {
    binding = execFileSync("docker", ["network", "inspect", name, "--format", `{{index .Options "${BINDING_OPTION}"}}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    binding = null; // The network does not exist yet.
  }

  if (binding === null) {
    execFileSync("docker", ["network", "create", "-o", `${BINDING_OPTION}=127.0.0.1`, name], { stdio: "ignore" });
    console.log(`Red ${name} creada solo en 127.0.0.1.`);
    return;
  }
  if (binding !== "127.0.0.1") {
    throw new Error(
      `La red ${name} existe pero publica los puertos en todas las interfaces. Detén Supabase y bórrala ` +
        `(docker network rm ${name}); se volverá a crear solo en 127.0.0.1.`,
    );
  }
}

// CLI: `tsx scripts/supabase-network.ts <network-name>`
if (process.argv[1]?.endsWith("supabase-network.ts")) {
  const name = process.argv[2];
  if (!name) {
    console.error("Uso: tsx scripts/supabase-network.ts <nombre-de-la-red>");
    process.exit(1);
  }
  try {
    ensureLocalOnlyNetwork(name);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
