#!/usr/bin/env node

import { getArgument } from "cli-argument-helper";
import { Exception, spawn } from "child-process-utilities";
import assert from "assert";
import fs from "fs";
import path from "path";
import Time from "./Time";
import getRatio from "./getRatio";
import getFileDuration from "./getFileDuration";
import getDuration from "./getDuration";
import spliceArray from "./spliceArray";
import adjustWidthFromRatio from "./adjustWidthFromRatio";
import resolveSuffix from "./resolveSuffix";
import getNamedArgument from "cli-argument-helper/getNamedArgument";
import { getString } from "cli-argument-helper/string";
import { getFloat, getInteger } from "cli-argument-helper/number";
import { addOption, cloneOptions, formatOptions, getOption } from "./options";

interface IOperation {
  command: string;
  args: string[];
}

interface IInput {
  format: string | null;
  value: string;
}

const palettegenOptions = [
  {
    name: "max_colors",
    description:
      "Set the maximum number of colors to quantize in the palette. " +
      "Note: the palette will still contain 256 colors; the unused palette entries will be black.",
  },
  {
    name: "reserve_transparent",
    description:
      "Create a palette of 255 colors maximum and reserve the last one for transparency. " +
      "Reserving the transparency color is useful for GIF optimization. If not set, the maximum of colors in the palette will be 256. " +
      "You probably want to disable this option for a standalone image. Set by default.",
  },
  {
    name: "transparency_color",
    description:
      "Set the color that will be used as background for transparency.",
  },
  {
    name: "stats_mode",
    description: "Set statistics mode.",
    values: [
      {
        name: "full",
        description: "Compute full frame histograms.",
      },
      {
        name: "diff",
        description:
          "Compute histograms only for the part that differs from previous frame. " +
          "This might be relevant to give more importance to the moving part of your input if the background is static.",
      },
      {
        name: "single",
        description: "Compute new histogram for each frame.",
      },
    ],
  },
] as const;

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
  const concurrency = getNamedArgument(args, "--concurrency", getInteger) ?? 1;
  const threads = getNamedArgument(args, "--threads", getInteger) ?? 1;
  const fps = getNamedArgument(args, "--fps", getInteger);
  const suffix =
    getNamedArgument(args, "--suffix", getString) ??
    ".:startTime-:endTime-:part";
  const compat =
    getArgument(args, "--compat") ??
    getArgument(args, "--compatibility") ??
    false;
  const outExtension =
    getNamedArgument(args, "--out-extension", getString) ?? "mp4";
  const videoBitrate = getNamedArgument(args, "--video-bitrate", getString);
  const audioBitrate = getNamedArgument(args, "--audio-bitrate", getString);
  const forceClearOutDir = getArgument(args, "--force-rm") !== null;

  /**
   * Defines whether to force the use of sRGB colorspace
   */
  const useSRGB = getArgument(args, "--srgb") !== null;

  const dryRun = getArgument(args, "--dry-run") !== null;
  let outFile = getNamedArgument(args, "--name", getString);

  /**
   * If used together with --dry-run, it will not print the output of the commands
   */
  const noStdout = getArgument(args, "--no-stdout") !== null;

  if (dryRun === null && noStdout !== null) {
    throw new Error("--no-stdout without --dry-run does not have an effect");
  }

  /**
   * Will dump a JSON file with the initial arguments and the FFmpeg arguments
   */
  const dumpJSON =
    getArgument(args, "--dump-json") ??
    getNamedArgument(args, "--dump-json", getString);

  const inputs = new Array<IInput>();

  {
    let value: string | null;
    do {
      const format =
        getNamedArgument(args, "-f", getString) ??
        getNamedArgument(args, "--format", getString);

      value =
        getNamedArgument(args, "-i", getString) ??
        getNamedArgument(args, "--input", getString);

      if (value === null) {
        if (format !== null) {
          throw new Exception("For every -f argument there must be an -i");
        }
        continue;
      }

      inputs.push({
        format,
        value,
      });
    } while (value !== null);
    assert.strict.ok(inputs.length > 0, "--input or -i is required");
  }

  /**
   * Video sources that are not dummy videos.
   * See: https://ffmpeg.org/ffmpeg-filters.html#toc-Examples-67
   */
  const fileVideoSources = inputs.filter(
    // Ignore dummy video sources
    (i) => !/(=|:)/.test(path.basename(i.value))
  );

  /**
   * Get the output directory
   */
  let clearOutDir = getArgument(args, "--rm") !== null;
  let outDir = getNamedArgument(args, "-o", getString);
  if (outDir === null) {
    assert.strict.ok(
      !clearOutDir,
      "You cannot use --rm without specifying an output directory. Use --force-rm to force deletion of the input file."
    );
    const [input] = fileVideoSources;
    if (typeof input !== "undefined") {
      outDir = input.value.replace(
        new RegExp(`.${path.extname(input.value)}$`),
        ".slicereel.parts"
      );
    } else {
      outDir = `${outFile}.slicereel.parts`;
    }
    if (!dryRun) {
      console.log("Automatically using output directory: %o", outDir);
    }
    clearOutDir = forceClearOutDir;
  } else if (forceClearOutDir) {
    throw new Exception("You cannot use --force-rm with --output");
  }

  /**
   * Define the cache directory
   */
  const cacheFolder = path.join(outDir, ".cache/slicereel");

  if (outFile === null) {
    const videoSource = fileVideoSources[0] ?? null;
    outFile = videoSource
      ? path
          .basename(videoSource.value)
          .replace(new RegExp(`${path.extname(videoSource.value)}$`), "")
      : "slicereel.untitled.video";
  }

  if (outFile === null) {
    throw new Exception("--name or --input is required");
  }

  assert.strict.ok(
    !outExtension.startsWith("."),
    "value passed to --out-extension must not start with a dot (i.e. --out-extension opus)"
  );

  if (clearOutDir) {
    await fs.promises.rm(outDir, {
      recursive: true,
      force: true,
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
   * Total duration of the file in seconds
   */
  let totalDuration = getNamedArgument(args, "--total-duration", getDuration);

  if (totalDuration === null) {
    if (fileVideoSources.length > 1) {
      throw new Exception(
        "Cannot determine total duration of multiple video sources"
      );
    }

    const inputFile = fileVideoSources[0]?.value ?? null;

    if (inputFile === null) {
      throw new Exception(
        "--total-duration must be specified if there are no file video sources"
      );
    }

    if (dryRun) {
      throw new Exception(
        "Cannot determine total duration in dry run mode. Please specify --total-duration."
      );
    } else {
      totalDuration = await getFileDuration(inputFile);
    }
  }

  /**
   * Define video duration until which the video will be sliced
   */
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

  /**
   * Get video width and height
   */
  let ratio = getNamedArgument(args, "--ratio", getFloat) ?? null;
  let width =
    getNamedArgument(args, "-w", getInteger) ??
    getNamedArgument(args, "--width", getInteger);
  let height = getNamedArgument(args, "--height", getInteger) ?? null;

  /**
   * Whether -hwaccel should be used or not
   */
  const hardwareAcceleration = getArgument(args, "--hwaccel") !== null;

  if (ratio === null && width !== null && height !== null) {
    ratio = width / height;
  }

  if (width !== null) {
    const inputFile = fileVideoSources[0]?.value ?? null;

    if (ratio === null) {
      if (inputFile === null) {
        throw new Exception(
          "--ratio must be specified if there are no file video sources"
        );
      }
      ratio = await getRatio(inputFile);
    }

    // Adjust width in order to be divisible by two
    width = adjustWidthFromRatio(width, ratio);
    height = width / ratio;
  }

  const spareArgument = args.shift();

  if (spareArgument) {
    throw new Error(`Unexpected argument ${spareArgument}`);
  }

  const pending = new Array<Promise<void>>();

  /**
   * If the user has defined the `width` or `height`, then it must contain the scale options
   */
  const shouldContainScaleOptions = width !== null || height !== null;

  const partCount = Math.ceil(until / partDuration);
  let startTime: number, i: number, endTime: number, initialStartTime: number;
  const ffmpegArgs = new Array<string>();
  const videoFilters = new Map<string, Map<string, string>>();
  const calls = new Array<IOperation[]>();
  const temporaryFiles = new Set<string>();
  let outputPart: string;
  let partSuffix: string;

  for (i = 0; i < partCount; i++) {
    initialStartTime = i * partDuration;
    if (i === 0) {
      startTime = initialStartTime + skip;
    } else {
      startTime = initialStartTime;
    }
    endTime = Math.min(until, initialStartTime + partDuration);
    partSuffix = resolveSuffix(suffix, {
      startTime,
      endTime,
      part: i,
    });
    outputPart = path.join(outDir, `${outFile}${partSuffix}.${outExtension}`);

    const sequence = new Array<IOperation>();
    const inputArguments = inputs
      .map((i) => {
        const args = ["-i", i.value];
        if (i.format !== null) {
          args.unshift("-f", i.format);
        }
        return args;
      })
      .flat();

    if (hardwareAcceleration) {
      ffmpegArgs.push("-hwaccel");
    }

    if (compat) {
      ffmpegArgs.push("-profile:v", "baseline", "-level", "3.0");
    }

    ffmpegArgs.push(
      "-ss",
      `${startTime}`,
      "-to",
      `${endTime}`,
      ...inputArguments,
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
        break;
    }

    /**
     * Add sRGB arguments, if necessary
     */
    if (useSRGB) {
      // addOption(getOption(videoFilters, "colorspace"), "colorspace", "srgb");
      // Add colorspace option to the palette video filters
      const colorspace = getOption(videoFilters, "colorspace");
      // addOption(colorspace, "all", "bt709");

      // Add the sRGB flag to the scale options
      addOption(colorspace, "srgb");
    }

    /**
     * Set video dimensions, FPS, and other video filters
     */
    switch (outExtension) {
      case "gif":
      case "mp4":
        if (shouldContainScaleOptions) {
          const scale = getOption(videoFilters, "scale");
          if (width !== null) {
            addOption(scale, "width", `${width}`);
            addOption(scale, "height", height === null ? "-1" : `${height}`);
          } else if (height !== null) {
            addOption(scale, "height", `${height}`);
            addOption(scale, "width", "-1");
          }
        }

        if (fps !== null) {
          const fpsOptions = getOption(videoFilters, "fps");
          addOption(fpsOptions, "fps", `${fps}`);
        }
        break;
    }

    switch (outExtension) {
      case "gif": {
        /**
         * Create the `.cache` folder if it does not exist
         */
        if (!dryRun) {
          try {
            await fs.promises.access(cacheFolder, fs.constants.W_OK);
          } catch (reason) {
            await fs.promises.mkdir(cacheFolder, { recursive: true });
          }
        }

        const paletteOutputFile = path.join(
          cacheFolder,
          `${path.basename(outputPart)}.palette.png`
        );
        const paletteVideoFilters = cloneOptions(videoFilters);
        const scaleOptions = getOption(paletteVideoFilters, "scale");
        const palettegen = getOption(paletteVideoFilters, "palettegen");

        /**
         * Set `lanczos` as the default flag
         */
        addOption(scaleOptions, "flags", "lanczos");

        for (const p of palettegenOptions) {
          const value = getNamedArgument(
            args,
            `--palettegen.${p.name}`,
            getString
          );
          if (value !== null) {
            addOption(palettegen, `${p.name}`, `${value}`);
          }
        }

        sequence.push({
          command: "ffmpeg",
          args: [
            ...ffmpegArgs,
            "-vf",
            formatOptions(paletteVideoFilters),
            paletteOutputFile,
          ],
        });

        // Add palette file as an input of the next video
        ffmpegArgs.push("-i", paletteOutputFile);

        // Add the palette file to the list of files to delete
        fileVideoSources.push({
          format: null,
          value: paletteOutputFile,
        });

        // Add `paletteuse` filter to the output video filter
        {
          const paletteuse = getOption(videoFilters, "paletteuse");
          for (const name of [
            "dither",
            "bayer_scale",
            "diff_mode",
            "new",
            "alpha_threshold",
          ]) {
            const value = getNamedArgument(
              args,
              `--paletteuse.${name}`,
              getString
            );
            if (value !== null) {
              addOption(paletteuse, name, value);
            }
          }
        }

        // Add the palette file to the list of temporary files
        temporaryFiles.add(paletteOutputFile);
        break;
      }
    }

    if (videoFilters.size) {
      ffmpegArgs.push("-vf", formatOptions(videoFilters));
    }

    if (preset !== null) {
      ffmpegArgs.push("-preset", preset);
    }

    /**
     * add output file as the last argument
     */
    ffmpegArgs.push(outputPart);

    /**
     * Push the ffmpeg command to the list of commands to run for this part
     */
    sequence.push({
      command: "ffmpeg",
      args: spliceArray(ffmpegArgs),
    });

    /**
     * Add the sequence to the list of calls to make
     */
    calls.push(spliceArray(sequence));

    /**
     * Clear video filters for the next part
     */
    videoFilters.clear();
  }

  if (dumpJSON !== null) {
    await fs.promises.mkdir(".slicereel", { recursive: true });
    await fs.promises.writeFile(
      typeof dumpJSON !== "string"
        ? `.slicereel/command-${new Date().toISOString()}.json`
        : dumpJSON,
      JSON.stringify(calls, null, 2)
    );
  }

  if (dryRun) {
    process.stdout.write(JSON.stringify(spliceArray(calls), null, 2));
  } else {
    for (const sequence of calls) {
      if (pending.length >= concurrency) {
        await Promise.all(pending.splice(0, 1));
      }

      pending.push(
        spliceArray(sequence).reduce(
          (previous, current) =>
            previous
              .then(() => spawn(current.command, current.args).wait())
              .then(() => {}),
          Promise.resolve()
        )
      );

      calls.splice(0, 1);
    }

    await Promise.all(pending.splice(0, pending.length));

    // Delete temporary files
    for (const file of temporaryFiles) {
      await fs.promises.rm(file);
    }
  }
})().catch((reason) => {
  process.stdout.write(
    JSON.stringify({
      error: reason instanceof Exception ? reason.what : `${reason}`,
    })
  );
  process.exitCode = 1;
});
