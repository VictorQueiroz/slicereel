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
import getFileDuration from "./getFileDuration";
import getDuration from "./getDuration";
import spliceArray from "./spliceArray";
import adjustWidthFromRatio from "./adjustWidthFromRatio";
import resolveSuffix from "./resolveSuffix";

(async () => {
  const args = process.argv.slice(2);
  const shouldPrintHelpText =
    (getArgument(args, "-h") ?? getArgument(args, "--help")) !== null;
  if (shouldPrintHelpText) {
    fs.createReadStream(path.resolve(__dirname, "HELP")).pipe(process.stdout);
    return;
  }
  const partDuration =
    getNamedArgument(args, "--duration", getDuration) ??
    getNamedArgument(args, "-d", getDuration) ??
    Time.HOUR;
  const skip = getNamedArgument(args, "--skip", getDuration) ?? Time.ZERO;
  const preset = getNamedArgument(args, "--preset", getString);
  const inputFile = getNamedArgument(args, "-i", getResolvedString);
  const concurrency = getNamedArgument(args, "--concurrency", getInteger) ?? 1;
  const threads = getNamedArgument(args, "--threads", getInteger) ?? 1;
  const fps = getNamedArgument(args, "--fps", getInteger);
  const suffix =
    getNamedArgument(args, "--suffix", getString) ??
    ".$startTime-$endTime-$part";
  const compat =
    getArgument(args, "--compat") ??
    getArgument(args, "--compatibility") ??
    false;
  const outExtension =
    getNamedArgument(args, "--out-extension", getString) ?? "mp4";
  const videoBitrate = getNamedArgument(args, "--video-bitrate", getString);
  const audioBitrate = getNamedArgument(args, "--audio-bitrate", getString);
  let clearOutDir = getArgument(args, "--rm") !== null;
  let width =
    getNamedArgument(args, "-w", getInteger) ??
    getNamedArgument(args, "--width", getInteger);
  assert.strict.ok(inputFile !== null, "-i is required");
  let outDir = getNamedArgument(args, "-o", getResolvedString);
  const forceClearOutDir = getArgument(args, "--force-rm") !== null;
  const dryRun = getArgument(args, "--dry-run") !== null;

  if (outDir === null) {
    assert.strict.ok(
      !clearOutDir,
      "You cannot use --rm without specifying an output directory. Use --force-rm to force deletion of the input file."
    );
    outDir = inputFile.replace(
      new RegExp(`.${path.extname(inputFile)}$`),
      ".slicereel.output.parts"
    );
    console.log("Automatically using output directory: %o", outDir);
    clearOutDir = forceClearOutDir;
  } else if (forceClearOutDir) {
    throw new Exception("You cannot use --force-rm with --output");
  }

  try {
    await fs.promises.access(inputFile, fs.constants.R_OK);
  } catch (reason) {
    throw new Error(`Input file ${inputFile} does not exist`);
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
   * total duration of the file in seconds
   */
  const totalDuration = await getFileDuration(inputFile);
  const givenUntil = getNamedArgument(args, "--until", getDuration);

  if (givenUntil !== null) {
    if (givenUntil > totalDuration) {
      throw new Error(
        `--until ${Time.format(
          givenUntil
        )} is greater than the total duration of the file ${Time.format(
          totalDuration
        )}`
      );
    }
    if (givenUntil < skip) {
      throw new Error(
        `--until ${Time.format(givenUntil)} is less than --skip ${Time.format(
          skip
        )}`
      );
    }
  }

  const until = givenUntil ?? totalDuration;

  const spareArgument = args.shift();

  if (spareArgument) {
    throw new Error(`Unexpected argument ${spareArgument}`);
  }

  const ratio = await getRatio(inputFile);

  if (width !== null) {
    width = adjustWidthFromRatio(width, ratio);
  }

  const pending = new Array<Promise<void>>();

  const partCount = Math.ceil(until / partDuration);
  let startTime: number, i: number, endTime: number, initialStartTime: number;
  const ffmpegArgs = new Array<string>();
  const videoFilters = new Map<string, string>();
  let outputPart: string;

  if (dryRun) {
    console.log("Here are the commands that will be run:");
  }

  for (i = 0; i < partCount; i++) {
    if (pending.length >= concurrency) {
      await Promise.all(pending.splice(0, 1));
    }
    initialStartTime = i * partDuration;
    if (i === 0) {
      startTime = initialStartTime + skip;
    } else {
      startTime = initialStartTime;
    }
    endTime = Math.min(until, initialStartTime + partDuration);
    outputPart = path.resolve(
      outDir,
      `${path.basename(inputFile).replace(
        /(\.[A-Za-z0-9]+)$/,
        resolveSuffix(suffix, {
          startTime,
          endTime,
          part: i
        })
      )}`
    );
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
      `${threads}`
    );
    if (videoBitrate !== null) {
      /**
       * video bitrate
       */
      ffmpegArgs.push("-b:v", videoBitrate);
    }
    if (audioBitrate !== null) {
      /**
       * audio bitrate
       */
      ffmpegArgs.push("-b:a", audioBitrate);
    }
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

    if (videoFilters.size) {
      ffmpegArgs.push(
        "-vf",
        Array.from(videoFilters)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    }

    if (preset !== null) {
      ffmpegArgs.push("-preset", preset);
    }

    /**
     * add output file as the last argument
     */
    ffmpegArgs.push(outputPart);

    if (dryRun) {
      console.log(
        "\tffmpeg",
        spliceArray(ffmpegArgs)
          .map((s, index, args) => {
            const previousArg = index > 0 ? args[index - 1] ?? null : null;
            const shouldIndent =
              s.startsWith("-") ||
              (previousArg && !previousArg.startsWith("-"));
            if (shouldIndent) {
              s = `\n\t\t${s}`;
            }
            return s;
          })
          .join(" ")
      );
    } else {
      pending.push(spawn("ffmpeg", spliceArray(ffmpegArgs)).wait());
    }
  }
  await Promise.all(pending.splice(0, pending.length));
})().catch((reason) => {
  console.error(reason);
  process.exitCode = 1;
});
