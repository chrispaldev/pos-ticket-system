import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();
    return next.handle().pipe(map((value) => {
      if (typeof value === 'string') return value;
      return {
        statusCode: res.statusCode,
        ...value,
      }
    }));
  }
}