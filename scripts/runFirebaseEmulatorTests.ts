import { spawn } from "node:child_process";
import { mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable, Writable } from "node:stream";

const tempDirectory = await mkdtemp(join(tmpdir(), "c38-firebase-emulator-"));
const rulesPath = join(tempDirectory, "firestore.rules");
const configPath = join(tempDirectory, "firebase.json");
const sourceRulesPath = join(process.cwd(), "firestore.emulator.rules");
const emulatorLogPath = join(process.cwd(), "firestore-debug.log");
const hadEmulatorLog = existsSync(emulatorLogPath);

try {
  await copyFile(sourceRulesPath, rulesPath);
  await writeFile(
    configPath,
    JSON.stringify({
      firestore: { rules: rulesPath },
      emulators: {
        auth: { host: "127.0.0.1", port: 9099 },
        firestore: { host: "127.0.0.1", port: 8080 },
        ui: { enabled: false },
        singleProjectMode: true,
      },
    })
  );

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(process.cwd(), "node_modules", "firebase-tools", "lib", "bin", "firebase.js"),
        "emulators:exec",
        "--config",
        configPath,
        "--project",
        "demo-c38-emulator",
        "--only",
        "auth,firestore",
        "tsx tests/firebaseEmulator.test.ts",
      ],
      { stdio: ["inherit", "pipe", "pipe"] }
    );
    const output = (stream: Readable, destination: Writable) => {
      let pending = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk: string) => {
        const lines = (pending + chunk).split(/\r?\n/);
        pending = lines.pop() ?? "";
        for (const line of lines) {
          destination.write(/To reset the password for |To verify the email address /.test(line)
            ? "[Auth Emulator] Fake email action link suppressed.\n"
            : `${line}\n`);
        }
      });
      stream.on("end", () => {
        if (pending) destination.write(`${pending}\n`);
      });
    };
    output(child.stdout!, process.stdout);
    output(child.stderr!, process.stderr);
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });

  process.exitCode = exitCode;
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
  if (!hadEmulatorLog) await rm(emulatorLogPath, { force: true });
}
