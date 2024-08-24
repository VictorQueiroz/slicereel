import path from "path";
import { spawn } from "child_process";

export type CommandLineResult =
  | string[][]
  | {
      error: string;
    };

export default async function dryRun(args: string[]) {
  const cli = spawn(
    "node",
    [path.resolve(__dirname, "../index.js"), ...args, "--dry-run"],
    {
      stdio: "pipe",
    }
  );

  return new Promise<CommandLineResult>((resolve, reject) => {
    const chunks = new Array<string>();
    /**
     * Pipe the output of the CLI to the current process
     */
    cli.stderr.pipe(process.stderr);
    /**
     * Collect the output of the CLI
     */
    cli.stdout.on("data", (data) => {
      chunks.push(data.toString());
    });
    cli.on("exit", (code) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(chunks.join(""));
      } catch (reason) {
        reject(reason);
        return;
      }
      if (code === 0) {
        if (!Array.isArray(parsed)) {
          reject(new Error("Expected an array"));
          return;
        }
        resolve(parsed);
      } else {
        if (!parsed || typeof parsed !== "object" || !("error" in parsed)) {
          reject(new Error("Expected an object with an error key"));
          return;
        }
        const error = parsed["error"];
        if (typeof error !== "string") {
          reject(new Error("Expected an error message to be a string"));
          return;
        }
        resolve({
          error,
        });
      }
    });
  });
}
