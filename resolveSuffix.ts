import Time from "./Time";

export default function resolveSuffix(
  value: string,
  context: {
    startTime: number;
    endTime: number;
    part: number;
  }
) {
  const startTime = /:startTime/;
  const endTime = /:endTime/;
  const part = /:part/;
  if (!startTime.test(value) || !endTime.test(value)) {
    throw new Error(
      `--suffix must contain :startTime and :endTime, but it is ${value}`
    );
  }
  for (const v of [
    { test: startTime, value: Time.format(context.startTime) },
    { test: endTime, value: Time.format(context.endTime) },
    { test: part, value: context.part }
  ]) {
    value = value.replace(v.test, `${v.value}`);
  }
  return value;
}
