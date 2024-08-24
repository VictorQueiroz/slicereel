import assignOptions from "./assignOptions";

export type FilterOption = Map<string, string | null>;

export type FilterOptions = Map<string, FilterOption>;

export function createOptions(): FilterOptions {
  return new Map<string, FilterOption>();
}

export function cloneOptions(options: FilterOptions) {
  const clone = new Map<string, FilterOption>();
  for (const [key, value] of options) {
    clone.set(key, new Map(value));
  }
  return clone;
}

export function getOption(options: FilterOptions, key: string) {
  let option = options.get(key) ?? null;
  if (option === null) {
    option = new Map<string, string>();
    options.set(key, option);
  }
  return option;
}

export function addOption(
  filters: FilterOption,
  key: string,
  value: string | null = null
) {
  const existing = filters.get(key) ?? null;
  if (existing !== null) {
    throw new Error(`Option ${key} already exists`);
  }

  filters.set(key, value);
}

export function formatOptions(options: FilterOptions) {
  return Array.from(options)
    .map(([k, v]) => assignOptions(k, v))
    .join(",");
}
