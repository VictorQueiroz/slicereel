import Time from "./Time";

export default class TimeStringParser {
  readonly #value;
  readonly #singleNumberRegularExpression = /^[0-9]{1}$/;
  #offset = 0;
  public constructor(value: string) {
    this.#value = value;
  }
  public parse() {
    let seconds = 0;
    while (this.#current() !== null) {
      const n = this.#readInt();
      const postIntegerLetter = this.#readSingleCharacter().toLowerCase();
      switch (postIntegerLetter) {
        case "h":
          seconds += n * Time.HOUR;
          break;
        case "m":
          seconds += n * Time.MINUTE;
          break;
        case "s":
          seconds += n;
          break;
        default:
          throw new Error(
            `Expected "h", "m" or "s", but got ${postIntegerLetter} instead`
          );
      }
    }
    return seconds;
  }
  #readSingleCharacter() {
    const ch = this.#current();
    if (ch === null) {
      throw new Error("Failed to read character");
    }
    this.#offset++;
    return ch;
  }
  #readInt() {
    const start = this.#offset;
    let ch = this.#current();
    while (ch !== null && this.#singleNumberRegularExpression.test(ch)) {
      this.#offset++;
      ch = this.#current();
    }
    if (start === this.#offset) {
      throw new Error("Failed to read integer");
    }
    return parseInt(this.#value.substring(start, this.#offset), 10);
  }
  #current() {
    return this.#value[this.#offset] ?? null;
  }
}
