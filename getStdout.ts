import { spawn } from "child-process-utilities";

export default async function getStdout(cmd: string, args: string[]) {
  const ratio = spawn(cmd, args, {
    stdio: "pipe",
  });
  const chunks = new Array<Buffer>();
  ratio.childProcess.stdout?.on("data", (chunk) => {
    chunks.push(chunk);
  });
  await ratio.wait();
  return Buffer.concat(chunks).toString("utf8");
}
