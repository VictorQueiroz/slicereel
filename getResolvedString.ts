import { getString } from "cli-argument-helper";
import path from "path";

export default function getResolvedString(
  args: string[],
  index?: number
): string | null {
  const value = getString(args, index);
  if (value === null) {
    return null;
  }
  return path.resolve(process.cwd(), value);
}
