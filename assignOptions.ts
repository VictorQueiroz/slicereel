import { FilterOption } from "./options";

/**
 * Assigns options to a key. If `options` is empty, the key is returned as is.
 *
 * For example:
 *
 * ```ts
 * assignOptions("palettegen", []); // returns "palettegen"
 * assignOptions("palettegen", ["max_colors=256"]); // returns "palettegen=max_colors=256"
 * assignOptions("fps", ["fps=film", "round=near"]); // returns "fps=fps=film:round=near"
 * ```
 *
 * @param key Option key
 * @param options Option values
 * @returns A formatted string with the key and options
 */
export default function assignOptions(key: string, options: FilterOption) {
  const formattedOptions =
    options.size > 0
      ? Array.from(options)
          .map(([k, v]) => (v !== null ? `${k}=${v}` : k))
          .join(":")
      : null;
  return `${key}${formattedOptions !== null ? `=${formattedOptions}` : ""}`;
}
