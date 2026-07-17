export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Access unauthorized. Please login first.',
  FORBIDDEN: 'Access forbidden. You do not have permissions.',
  NOT_FOUND: 'Resource not found.',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
} as const;

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  AUDITOR: 'AUDITOR',
} as const;
