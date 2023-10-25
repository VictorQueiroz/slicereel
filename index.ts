#!/usr/bin/env node

import {
  getArgument,
  getInteger,
  getNamedArgument,
  getString
} from "cli-argument-helper";
import { Exception, spawn } from "child-process-utilities";
import assert from "assert";
import fs from "fs";
import path from "path";
import getResolvedString from "./getResolvedString";
import Time from "./Time";
import getRatio from "./getRatio";
import isOdd from "./isOdd";
import getFileDuration from "./getFileDuration";
import chalk from "chalk";

(async () => {
  const args = process.argv.slice(2);
  const shouldPrintHelpText =
    (getArgument(args, "-h") ?? getArgument(args, "--help")) !== null;
  if (shouldPrintHelpText) {
    fs.createReadStream(path.resolve(__dirname, "HELP")).pipe(process.stdout);
    return;
  }
  const partDurationInMinutes =
    getNamedArgument(args, "--duration", getInteger) ??
    getNamedArgument(args, "-d", getInteger) ??
    60;
  const inputFile = getNamedArgument(args, "-i", getResolvedString);
  const concurrency = getNamedArgument(args, "--concurrency", getInteger) ?? 1;
  const threads = getNamedArgument(args, "--threads", getInteger) ?? 1;
  const fps = getNamedArgument(args, "--fps", getInteger);
  const compat =
    getArgument(args, "--compat") ??
    getArgument(args, "--compatibility") ??
    false;
  const outExtension =
    getNamedArgument(args, "--out-extension", getString) ?? "mp4";
  const videoBitrate =
    getNamedArgument(args, "--video-bitrate", getString) ?? "1M";
  const audioBitrate =
    getNamedArgument(args, "--audio-bitrate", getString) ?? "32k";
  let clearOutDir = getArgument(args, "--rm") !== null;
  let width =
    getNamedArgument(args, "-w", getInteger) ??
    getNamedArgument(args, "--width", getInteger);
  assert.strict.ok(partDurationInMinutes !== null, "--duration is required");
  assert.strict.ok(inputFile !== null, "-i is required");
  let outDir = getNamedArgument(args, "-o", getResolvedString);
  const forceClearOutDir = getArgument(args, "--force-rm") !== null;

  if (outDir === null) {
    assert.strict.ok(
      !clearOutDir,
      "You cannot use --rm without specifying an output directory. Use --force-rm to force deletion of the input file."
    );
    outDir = inputFile.replace(
      new RegExp(`.${path.extname(inputFile)}$`),
      ".slicereel.output.parts"
    );
    console.log("Automatically using output directory: %o", chalk.red(outDir));
    clearOutDir = forceClearOutDir;
  } else if (forceClearOutDir) {
    throw new Exception("You cannot use --force-rm with --output");
  }

  try {
    await fs.promises.access(inputFile, fs.constants.R_OK);
  } catch (reason) {
    throw new Error(`Input file ${inputFile} does not exist`);
  }

  const spareArgument = args.shift();

  if (spareArgument) {
    throw new Error(`Unexpected argument ${spareArgument}`);
  }

  assert.strict.ok(
    !outExtension.startsWith("."),
    "value passed to --out-extension must not start with a dot (i.e. --out-extension opus)"
  );

  if (clearOutDir) {
    await fs.promises.rm(outDir, {
      recursive: true,
      force: true
    });
  }

  try {
    await fs.promises.access(outDir, fs.constants.W_OK);
    assert.strict.ok(
      (await fs.promises.stat(outDir)).isDirectory(),
      `${outDir} is not a directory`
    );
  } catch (reason) {
    await fs.promises.mkdir(outDir, { recursive: true });
  }

  /**
   * convert part duration to seconds
   */
  const partDuration = partDurationInMinutes * Time.MINUTE;

  /**
   * total duration of the file in seconds
   */
  const totalDuration = await getFileDuration(inputFile);

  const ratio = await getRatio(inputFile);

  if (width !== null) {
    const oldWidth = width;
    while (
      Math.floor(width / ratio) !== width / ratio ||
      isOdd(width / ratio)
    ) {
      width++;
    }
    if (width !== oldWidth) {
      console.warn(
        `Warning: --width ${oldWidth} is not divisible by the aspect ratio ${ratio}. Using --width ${width} instead.`
      );
    }
  }

  const pending = new Array<Promise<void>>();

  const partCount = Math.ceil(totalDuration / partDuration);

  for (let i = 0; i < partCount; i++) {
    if (pending.length >= concurrency) {
      await Promise.all(pending.splice(0, 1));
    }
    const startTime = i * partDuration;
    const endTime = Math.min(totalDuration, startTime + partDuration);
    const outputPart = path.resolve(
      outDir,
      `${path
        .basename(inputFile)
        .replace(
          /(\.[A-Za-z]+)$/,
          `.${Time.format(startTime)}-${Time.format(endTime)}.${outExtension}`
        )}`
    );
    const ffmpegArgs = new Array<string>();

    if (compat) {
      ffmpegArgs.push("-profile:v", "baseline", "-level", "3.0");
    }
    ffmpegArgs.push(
      "-ss",
      `${startTime}`,
      "-to",
      `${endTime}`,
      "-i",
      inputFile,
      "-threads",
      `${threads}`,
      /**
       * audio bitrate
       */
      "-b:a",
      audioBitrate
    );
    const videoFilters = new Map<string, string>();
    switch (outExtension) {
      case "aac":
        ffmpegArgs.push(
          /**
           * audio codec
           */
          "-c:a",
          "aac"
        );
        break;
      case "opus":
        ffmpegArgs.push("-c:a", "libopus");
        if (width === null) {
          console.warn("ignoring --width argument");
        }
        break;
      case "mkv":
      case "avi":
      case "webm":
        throw new Exception(`Unsupported output format ${outExtension}`);
      case "mp4":
        ffmpegArgs.push(
          /**
           * video bitrate
           */
          "-b:v",
          videoBitrate,
          /**
           * video codec
           */
          "-c:v",
          "libx264"
        );
        if (width !== null) {
          videoFilters.set("scale", `${width}:-1`);
        }
        break;
    }

    if (fps !== null) {
      videoFilters.set("fps", `${fps}`);
    }

      ffmpegArgs.push(
        "-vf",
        Array.from(videoFilters)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );

    /**
     * add output file as the last argument
     */
    ffmpegArgs.push(outputPart);

    pending.push(spawn("ffmpeg", ffmpegArgs).wait());
  }
  await Promise.all(pending.splice(0, pending.length));
})().catch((reason) => {
  console.error(reason);
  process.exitCode = 1;
});
