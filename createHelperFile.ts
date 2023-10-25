import CodeStream from "textstreamjs";
import chalk from "chalk";
import assert from "assert";
import fs from "fs";
import path from "path";

interface IArgumentDescription {
  name: string[];
  args: ("string" | "number")[];
  defaultValue: number | string | "inherit" | null;
  examples: (string | number)[][];
  description: string[];
}

const lines: IArgumentDescription[] = [
  {
    name: ["-i"],
    args: ["string"],
    defaultValue: null,
    examples: [
      ["video.mp4"],
      ["audio.opus"],
      ["audio.acc"],
      ["audio.mp3"],
      ["audio.m4a"],
      ["audio.wav"]
    ],
    description: ["Input file. It can be any file supported by ffmpeg."]
  },
  {
    name: ["-o"],
    args: ["string"],
    examples: [["video.parts"], ["audio.parts"], ["$HOME/Videos/video.parts"]],
    defaultValue: `\${inputFileWithoutExtension}.slicereel.output.parts`,
    description: [
      "Output directory where each part will be saved. If omitted, it will be selected automatically.",
      "The automatic selection of the file name is done through transformation of the input file name.",
      "We remove the input file extension, and append `slicereel.output.parts` to it, which will be a directory."
    ]
  },
  {
    name: ["-d", "--duration"],
    args: ["number"],
    examples: [[30], [60], [120]],
    defaultValue: 60,
    description: ["Duration of each part in minutes."]
  },
  {
    name: ["--concurrency"],
    args: ["number"],
    examples: [[1, 4]],
    defaultValue: 1,
    description: ["Number of parts to process at the same time."]
  },
  {
    name: ["--threads"],
    args: ["number"],
    examples: [[1, 4, "$(nproc)"]],
    defaultValue: 1,
    description: ["Amount of threads to use for each part."]
  },
  {
    name: ["--fps"],
    args: ["number"],
    defaultValue: "inherit",
    examples: [[15], [30], [24], [60]],
    description: [
      "Frames per second. If not specified, we will simply not pass any argument to the FFmpeg."
    ]
  },
  {
    name: ["-w", "--width"],
    args: ["number"],
    examples: [[1280], [1920], [2560]],
    defaultValue: "inherit",
    description: [
      "In case of a video, each part will be resized to the specified value while keeping the aspect ration.",
      "If `width / originalAspectRatio` results in a value that is not divisible by 2, the width will be incremented by 1 until we have a correct value."
    ]
  },
  {
    name: ["--out-extension"],
    args: ["string"],
    examples: [["mp4"], ["mkv"], ["avi"]],
    defaultValue: "mp4",
    description: ["Output extension. It can be any file supported by ffmpeg."]
  },
  {
    name: ["--video-bitrate"],
    args: ["string"],
    examples: [["1M"], ["256k"], ["128k"]],
    defaultValue: "1M",
    description: [
      "In case of a video, it's the video bitrate that's gonna be forwarded to the FFmpeg command."
    ]
  },
  {
    name: ["--audio-bitrate"],
    args: ["string"],
    examples: [["1M"], ["256k"], ["128k"]],
    defaultValue: "32k",
    description: [
      "In case of a audio, it's the audio bitrate that's gonna be forwarded to the FFmpeg command."
    ]
  }
];

function writeArguments(cs: CodeStream, lines: IArgumentDescription[]) {
  for (const l of lines) {
    const [firstArg] = l.name;
    assert.strict.ok(typeof firstArg !== "undefined");
    for (const name of l.name) {
      cs.write(
        `${name} ${l.args
          .map((a) => {
            let out: string = a;
            switch (a) {
              case "string":
                out = chalk.blue(a);
                break;
              case "number":
                out = chalk.green(a);
                break;
            }
            return `<${out}>`;
          })
          .join(" ")}\n`
      );
    }
    cs.indentBlock(() => {
      cs.write(`${l.description.join(" ")}\n\n`);
      cs.write("Examples:\n");
      cs.indentBlock(() => {
        for (const example of l.examples) {
          cs.write(`${firstArg} ${example.join(" ")}\n`);
        }
      });
    });
    if (l !== lines[lines.length - 1]) {
      cs.append("\n");
    }
  }
}

async function generateHelpFile() {
  const cs = new CodeStream();
  cs.write("slicereel:\n\n");
  cs.write(
    "A command-line tool to easily slice videos into many parts implemented in Node.js.\n\n"
  );
  cs.write(`${chalk.redBright("Required:")}\n`);
  cs.indentBlock(() => {
    writeArguments(
      cs,
      lines.filter((l) => l.defaultValue === null)
    );
  });
  cs.append("\n");
  cs.write(`${chalk.green("Optional:")}\n`);
  cs.indentBlock(() => {
    writeArguments(
      cs,
      lines.filter(
        (l) => l.defaultValue !== null || l.defaultValue === "inherit"
      )
    );
  });
  cs.append("\n");
  cs.write("Usage: slicereel -i video.mp4 --fps 15\n\n");
  await fs.promises.writeFile(path.resolve(__dirname, "HELP"), cs.value());
}

generateHelpFile().catch((reason) => {
  console.error(reason);
  process.exitCode = 1;
});
