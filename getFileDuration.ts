import assert from "assert";
import getStdout from "./getStdout";

export default async function getFileDuration(inputFile: string) {
  const unparsedDuration = await getStdout("ffprobe", [
    "-i",
    inputFile,
    "-show_entries",
    "format=duration",
    "-v",
    "quiet",
    "-of",
    "csv=p=0",
  ]);

  /**
   * total duration of the file in seconds
   */
  const totalDuration = parseFloat(unparsedDuration);
  assert.strict.ok(
    !Number.isNaN(totalDuration),
    `Invalid duration: ${unparsedDuration}`
  );
  assert.strict.ok(
    Number.isFinite(totalDuration),
    `Invalid duration: ${unparsedDuration}`
  );

  return totalDuration;
}
