import test from "node:test";
import TimeStringParser from "./TimeStringParser";
import assert from "node:assert";

test("TimeStringParser: 1h30m30s should result in 5430 seconds", () => {
  assert.strict.equal(new TimeStringParser("1h30m30s").parse(), 5430);
});

test("TimeStringParser: 1h30s should result in 3630 seconds", () => {
  assert.strict.equal(new TimeStringParser("1h30s").parse(), 3630);
});

test("TimeStringParser: 30m should result in 1800 seconds", () => {
  assert.strict.equal(new TimeStringParser("30m").parse(), 1800);
});

test("TimeStringParser: 30s should result in 30 seconds", () => {
  assert.strict.equal(new TimeStringParser("30s").parse(), 30);
});

test("TimeStringParser: 1s should result in 1 seconds", () => {
  assert.strict.equal(new TimeStringParser("1s").parse(), 1);
});

test("TimeStringParser: it should support repeated pairs", () => {
  assert.strict.equal(new TimeStringParser("1s1s1s1s").parse(), 4);
});

test("TimeStringParser: it should fail for invalid formats", () => {
  assert.throws(() => {
    new TimeStringParser("30").parse();
  }, /Failed to read character/);
  assert.throws(() => {
    new TimeStringParser("s").parse();
  }, /Failed to read integer/);
});

test("TimeStringParser: 200000s should result in 200000 seconds", () => {
  assert.strict.equal(new TimeStringParser("200000s").parse(), 200000);
});
