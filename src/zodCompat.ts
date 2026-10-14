import { z } from 'zod';

/**
 * Zod 4 reworded the default issue messages. Tool errors and thrown
 * `ZodError` text are part of the client-visible result, so keep the Zod 3
 * wording for the cases this server surfaces.
 */
z.config({
  customError: (issue) => {
    if (issue.code === 'invalid_type') {
      return `Expected ${String(issue.expected)}, received ${receivedType(issue.input)}`;
    }

    if (issue.code === 'invalid_value' && 'values' in issue && Array.isArray(issue.values)) {
      const expected = issue.values.map((value) => `'${String(value)}'`).join(' | ');
      return `Invalid enum value. Expected ${expected}, received '${String(issue.input)}'`;
    }

    if (issue.code === 'too_small' && issue.origin === 'number') {
      const bound = String(issue.minimum);
      return issue.inclusive
        ? `Number must be greater than or equal to ${bound}`
        : `Number must be greater than ${bound}`;
    }

    if (issue.code === 'too_big' && issue.origin === 'number') {
      const bound = String(issue.maximum);
      return issue.inclusive
        ? `Number must be less than or equal to ${bound}`
        : `Number must be less than ${bound}`;
    }

    return undefined;
  },
});

function receivedType(input: unknown): string {
  if (input === null) {
    return 'null';
  }
  if (input === undefined) {
    return 'undefined';
  }
  if (Array.isArray(input)) {
    return 'array';
  }
  if (typeof input === 'number' && Number.isNaN(input)) {
    return 'nan';
  }
  return typeof input;
}
