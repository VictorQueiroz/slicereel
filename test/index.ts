import { describe, it } from "node:test";
import TimeStringParser from "../TimeStringParser";
import assert from "node:assert";
import { expect } from "chai";
import dryRun from "./dryRun";
import { addOption, createOptions, formatOptions, getOption } from "../options";

describe("assignOptions", () => {
  it("should assign options to a key without a value", () => {
    const options = createOptions();

    const colorspace = getOption(options, "colorspace");

    addOption(colorspace, "all", "bt709");
    addOption(colorspace, "srgb");

    expect(formatOptions(options)).to.be.equal("colorspace=all=bt709:srgb");
  });
});

describe("TimeStringParser", () => {
  it("should transform 1h30m30s into 5430 seconds", () => {
    assert.strict.equal(new TimeStringParser("1h30m30s").parse(), 5430);
  });

  it("should transform 1h30s into 3630 seconds", () => {
    assert.strict.equal(new TimeStringParser("1h30s").parse(), 3630);
  });

  it("should transform 30m into 1800 seconds", () => {
    assert.strict.equal(new TimeStringParser("30m").parse(), 1800);
  });

  it("should transform 30s into 30 seconds", () => {
    assert.strict.equal(new TimeStringParser("30s").parse(), 30);
  });

  it("should transform 1s into 1 seconds", () => {
    assert.strict.equal(new TimeStringParser("1s").parse(), 1);
  });

  it("should support repeated pairs", () => {
    assert.strict.equal(new TimeStringParser("1s1s1s1s").parse(), 4);
  });

  it("should fail for invalid formats", () => {
    assert.throws(() => {
      new TimeStringParser("30").parse();
    }, /Failed to read character/);
    assert.throws(() => {
      new TimeStringParser("s").parse();
    }, /Failed to read integer/);
  });

  it("should transform 200000s into 200000 seconds", () => {
    assert.strict.equal(new TimeStringParser("200000s").parse(), 200000);
  });
});

describe("CLI", () => {
  it("should require --total-duration when --dry-run mode is activated", async () => {
    expect(
      await dryRun(["-i", "test.mp4", "-o", "output", "--out-extension", "gif"])
    ).to.be.deep.equal({
      error:
        "Cannot determine total duration in dry run mode. Please specify --total-duration.",
    });
  });

  describe("GIF", () => {
    it("should convert a video into a gif", async () => {
      expect(
        await dryRun([
          "-i",
          "test.mp4",
          "-o",
          "output",
          "--out-extension",
          "gif",
          "--total-duration",
          "10s",
        ])
      ).to.be.deep.equal([
        [
          {
            command: "ffmpeg",
            args: [
              "-ss",
              "0",
              "-to",
              "10",
              "-i",
              "test.mp4",
              "-threads",
              "1",
              "-vf",
              "scale=flags=lanczos,palettegen",
              "output/.cache/slicereel/test.0s-10s-0.gif.palette.png",
            ],
          },
          {
            command: "ffmpeg",
            args: [
              "-ss",
              "0",
              "-to",
              "10",
              "-i",
              "test.mp4",
              "-threads",
              "1",
              "-i",
              "output/.cache/slicereel/test.0s-10s-0.gif.palette.png",
              "-vf",
              "paletteuse",
              "output/test.0s-10s-0.gif",
            ],
          },
        ],
      ]);
    });

    it("should contain FPS option if the --fps argument is used", async () => {
      expect(
        await dryRun([
          "-i",
          "test.mp4",
          "-o",
          "output",
          "--out-extension",
          "gif",
          "--total-duration",
          "10s",
          "--fps=10",
        ])
      ).to.be.deep.equal([
        [
          {
            command: "ffmpeg",
            args: [
              "-ss",
              "0",
              "-to",
              "10",
              "-i",
              "test.mp4",
              "-threads",
              "1",
              "-vf",
              "fps=fps=10,scale=flags=lanczos,palettegen",
              "output/.cache/slicereel/test.0s-10s-0.gif.palette.png",
            ],
          },
          {
            command: "ffmpeg",
            args: [
              "-ss",
              "0",
              "-to",
              "10",
              "-i",
              "test.mp4",
              "-threads",
              "1",
              "-i",
              "output/.cache/slicereel/test.0s-10s-0.gif.palette.png",
              "-vf",
              "fps=fps=10,paletteuse",
              "output/test.0s-10s-0.gif",
            ],
          },
        ],
      ]);
    });

    it("should contain FPS FFmpeg option and only width if no height is provided, but ratio is provided", async () => {
      expect(
        await dryRun([
          "-i",
          "test.mp4",
          "-o",
          "output",
          "--out-extension",
          "gif",
          "--total-duration",
          "10s",
          "--fps=10",
          "--ratio=1",
          "--width=320",
          "--dump-json",
        ])
      ).to.be.deep.equal([
        [
          {
            command: "ffmpeg",
            args: [
              "-ss",
              "0",
              "-to",
              "10",
              "-i",
              "test.mp4",
              "-threads",
              "1",
              "-vf",
              "scale=width=320:height=320:flags=lanczos,fps=fps=10,palettegen",
              "output/.cache/slicereel/test.0s-10s-0.gif.palette.png",
            ],
          },
          {
            command: "ffmpeg",
            args: [
              "-ss",
              "0",
              "-to",
              "10",
              "-i",
              "test.mp4",
              "-threads",
              "1",
              "-i",
              "output/.cache/slicereel/test.0s-10s-0.gif.palette.png",
              "-vf",
              "scale=width=320:height=320,fps=fps=10,paletteuse",
              "output/test.0s-10s-0.gif",
            ],
          },
        ],
      ]);
    });
  });
});
