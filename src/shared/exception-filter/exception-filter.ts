import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { ErrorResponse } from '../interfaces';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus ? exception.getStatus() : 400;
    let errorMessage = exception?.message;
    let details = undefined;
   
    if (typeof exception === 'string') errorMessage = exception;
    else if (exception.getResponse && typeof exception.getResponse() === 'object') {
      const exceptionResp = exception.getResponse() as ErrorResponse;
      if (exceptionResp.error) errorMessage = exceptionResp.error;
      if (exceptionResp.message && typeof exceptionResp.message === 'string') errorMessage = exceptionResp.message;
      if (exceptionResp.message && typeof exceptionResp.message === 'object') details = exceptionResp.message;
    }

    response.status(status).json({
      statusCode: status,
      msg: errorMessage,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
