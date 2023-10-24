import { Exception } from "child-process-utilities";

export default class Time {
  static SECOND = 1;
  static MINUTE = 60 * this.SECOND;
  static HOUR = 60 * this.MINUTE;
  static format(seconds: number): string {
    if (seconds < 0) {
      throw new Exception('Invalid input. "seconds" must be greater than 0.');
    }

    let remainingSeconds = seconds;
    const hours = Math.floor(remainingSeconds / 3600);
    remainingSeconds %= 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    remainingSeconds %= 60;

    let formattedTime = "";

    if (hours > 0) {
      formattedTime += `${hours}h`;
    }
    if (minutes > 0) {
      formattedTime += `${minutes}m`;
    }
    if (remainingSeconds > 0 || formattedTime === "") {
      formattedTime += `${remainingSeconds}s`;
    }

    return formattedTime;
  }
}
