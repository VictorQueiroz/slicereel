export default function resolveSuffix(
  value: string,
  context: {
    startTime: number;
    endTime: number;
    part: number;
  }
) {
  const startTime = /\$startTime/;
  const endTime = /\$endTime/;
  const part = /\$part/;
  if (!startTime.test(value) || !endTime.test(value)) {
    throw new Error(`--suffix must contain either $startTime and $endTime`);
  }
  for (const v of [
    { test: startTime, value: context.startTime },
    { test: endTime, value: context.endTime },
    { test: part, value: context.part }
  ]) {
    value = value.replace(v.test, v.value.toString());
  }
  return value;
}
