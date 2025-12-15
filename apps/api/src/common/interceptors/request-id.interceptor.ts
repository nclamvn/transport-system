import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get existing request ID from header or generate new one
    const requestId = request.headers[REQUEST_ID_HEADER] || uuidv4();

    // Attach to request for use in services
    request.requestId = requestId;

    // Add to response headers for traceability
    response.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle();
  }
}
