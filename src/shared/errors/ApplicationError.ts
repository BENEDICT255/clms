export abstract class ApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends ApplicationError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class AuthenticationError extends ApplicationError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
}

export class AuthorizationError extends ApplicationError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
}

export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

export class ConflictError extends ApplicationError {
  readonly code = 'CONFLICT_ERROR';
  readonly statusCode = 409;
}

export class FinancialInvariantError extends ApplicationError {
  readonly code = 'FINANCIAL_INVARIANT_VIOLATION';
  readonly statusCode = 422;
}

export class ConcurrencyError extends ApplicationError {
  readonly code = 'CONCURRENCY_CONFLICT';
  readonly statusCode = 409;
}
