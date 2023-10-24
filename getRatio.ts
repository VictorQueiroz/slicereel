import assert from "assert";
import getStdout from "./getStdout";

export default async function getRatio(inputFile: string) {
  let ratio = await getStdout("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=display_aspect_ratio",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputFile,
  ]);
  assert.strict.ok(ratio.length > 0);
  /**
   * remove anything that's not numbers or a colon
   */
  ratio = ratio.replace(/[^0-9:]+/, "");
  /**
   * test that the ratio is in the format of "a:b"
   */
  assert.strict.ok(/^[0-9]+\:[0-9]+$/.test(ratio));
  const [a, b] = ratio.split(":").map((n) => {
    const i = parseInt(n, 10);
    assert.strict.ok(!Number.isNaN(i), `Invalid ratio: ${ratio}`);
    assert.strict.ok(Number.isFinite(i), `Invalid ratio: ${ratio}`);
    return i;
  });
  assert.strict.ok(typeof a === "number" && typeof b === "number");
  return a / b;
}
