import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { clc, getColorByStatusCode } from '../utils';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    const now = Date.now();

    res.on('close', () => {
      const { statusCode } = res;
      const color = getColorByStatusCode(statusCode)
      this.logger.log(
        `${method} ${originalUrl} ${color(String(statusCode))} ${clc.yellow((Date.now() - now) + 'ms')} - ${userAgent} ${ip}`,
      );
    });

    next();
  }
}