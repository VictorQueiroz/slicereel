# slicereel

## Requirements

- ffmpeg
- ffprobe

## Description

This is a simple command-line tool to slice video into many parts using FFmpeg. You can define each part duration, the output format and much more.

## Installation

```bash
npm i -g slicereel
```

## Usage

In the example below, all the parts will be saved in the `input.mp4.parts` folder. Each output file will have the same name as the input file, with the slice of the video duration. For instance, let's suppose `input.mp4` has a total of 50 minutes of duration. The output files will be named as:

- input.0s-20m.mp4
- input.20m-40m.mp4
- input.40m-50m.mp4

```bash
slicereel -i input.mp4 -o input.mp4.parts -d 20m --out-extension mp4
```

### Resizing the video

When using the `--width` argument, the video aspect ratio will be automatically kept. In case the required width produces an odd height dimension, the width will be automatically adjusted so the height is _divisible by 2_, as this is required by **FFmpeg**.

```bash
slicereel -i input.mp4 -o input.mp4.parts --width 200
```

### You can define video/audio bitrate

```bash
slicereel -i input.mp4 -o input.mp4.parts -d 10m --video-bitrate 1M --audio-bitrate 32k
```

### Trimming

You can tell the command-line tool to start creating the parts from a certain part of the video using the `--skip` argument. For instance, if you want to start from the 10th minute of the video, you can do it like this:

```bash
slicereel -i input.mp4 --skip 6m10s
```

If you want to get just the first hour of the video, you can do:

```bash
slicereel -i input.mp4 --until 1h
```

Or if you want to skip the first 5 minutes, but stop at end of the first hour of the video, which will result in a **55 minutes video**, you can do:

```bash
slicereel -i input.mp4 --skip 5m --until 1h
```

If you're not interested in creating multiple parts of the video. You can tweak this functionality to emit just a single part of the video by setting the duration to the end of the video. For instance, if you want to get just the first 5 minutes of the video, you can do:

```bash
slicereel -i input.mp4 --until 5m --duration 5m
```

### Defining the frames-per-second

If the input video has 60fps, and you want to output a video with 20fps, you can do it like this. Since we omitted the -d argumentm, it will default to 60 minutes per part:

```bash
slicereel -i input.mp4 -o input.mp4.parts --fps 20
```

### Outputting slices of the audio of the video

```bash
slicereel -i input.mp4 -o input.mp4.parts -d 10m --out-extension opus --audio-bitrate 32k
```

### Concurrency and FFmpeg threading

If you want the video slicing to be faster, you can use the `--threads` argument, which will be passed to ffmpeg, or you can use the `--concurrency` argument, which will spawn multiple ffmpeg processes. The default value for `--threads` is 1, and the default value for `--concurrency` is 1.

```bash
slicereel -i input.mp4 -o input.mp4.parts --threads 2 --concurrency 100
```

If you're using Linux or macOS, you can use all threads available:

```bash
slicereel -i input.mp4 -o input.mp4.parts --threads $(nproc)
```

### Duration format

For setting each part to have 1 hour and 30 minutes, you can use the following format:

```bash
slicereel -i video.mp4 -d 1h30m
```

If you wish 10 hour and 30 minutes, you can use:

```bash
slicereel -i video.mp4 -d 10h30m
```

Or, if you wish 10 minutes and 30 seconds, you can use:

```bash
slicereel -i video.mp4 -d 10m30s
```

You can also pass repeated sequences, like:

```bash
slicereel -i video.mp4 -d 10s10s10s1s
```

It will result in 31 seconds for each part, as expected.

### More help

```bash
slicereel --help
```

```bash
slicereel -h
```
