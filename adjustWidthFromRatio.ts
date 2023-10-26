import isOdd from "./isOdd";

export default function adjustWidthFromRatio(width: number, ratio: number) {
  const oldWidth = width;
  while (Math.floor(width / ratio) !== width / ratio || isOdd(width / ratio)) {
    width++;
  }
  if (width !== oldWidth) {
    console.warn(
      `Warning: --width ${oldWidth} is not divisible by the aspect ratio ${ratio}. Using --width ${width} instead.`
    );
  }
  return width;
}
