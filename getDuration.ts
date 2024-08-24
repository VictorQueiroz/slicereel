import { getString } from "cli-argument-helper/string";
import TimeStringParser from "./TimeStringParser";

/**
 * @param args all arguments
 * @param index index where to find the duration from
 * @returns the duration parsed from a string in the expected format, as a number of seconds
 */
export default function getDuration(
  args: string[],
  index?: number
): number | null {
  const value = getString(args, index);
  if (value === null) {
    return null;
  }
  return new TimeStringParser(value).parse();
}
