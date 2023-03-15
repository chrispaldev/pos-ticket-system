import { LogLevel } from '@nestjs/common';

export const clc = {
  green: (text: string) => `\x1B[32m${text}\x1B[39m`,
  yellow: (text: string) => `\x1B[33m${text}\x1B[39m`,
  red: (text: string) => `\x1B[31m${text}\x1B[39m`,
  magentaBright: (text: string) => `\x1B[95m${text}\x1B[39m`,
  cyanBright: (text: string) => `\x1B[96m${text}\x1B[39m`,
};

export const getColorByLogLevel = (level: LogLevel) => {
  switch (level) {
    case 'debug':
      return clc.magentaBright;
    case 'warn':
      return clc.yellow;
    case 'error':
      return clc.red;
    case 'verbose':
      return clc.cyanBright;
    default:
      return clc.green;
  }
}

export const getColorByStatusCode = (statusCode: number) => {
  switch (true) {
    case (statusCode < 300):
      return clc.green;
    case (statusCode < 400):
      return clc.yellow;
    case (statusCode < 600):
      return clc.red;
    default:
      return clc.cyanBright;
  }
}