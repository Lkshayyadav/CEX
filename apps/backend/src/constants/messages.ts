export const AUTH_MESSAGES = {
  REGISTER_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  EMAIL_ALREADY_EXISTS: 'Email is already registered',
  USERNAME_ALREADY_EXISTS: 'Username is already taken',
  INVALID_CREDENTIALS: 'Invalid email/username or password',
  INTERNAL_ERROR: 'An unexpected error occurred during authentication',
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Access unauthorized. Please login first.',
  FORBIDDEN: 'Access forbidden. You do not have permissions.',
  NOT_FOUND: 'Resource not found.',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
} as const;
