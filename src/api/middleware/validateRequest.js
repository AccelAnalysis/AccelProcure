const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const defaultValidators = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  boolean: (value) => typeof value === 'boolean',
  array: (value) => Array.isArray(value),
  object: (value) => isObject(value),
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateValue = (key, value, rule = {}) => {
  const errors = [];
  const {
    type,
    required = false,
    enum: enumValues,
    minLength,
    maxLength,
    min,
    max,
    pattern,
    items,
    custom,
    format,
    nullable = false,
  } = rule;

  if ((value === undefined || value === null || value === '') && required && !nullable) {
    errors.push(`${key} is required`);
    return errors;
  }

  if ((value === undefined || value === null) && !required) {
    return errors;
  }

  if (type && defaultValidators[type] && !defaultValidators[type](value)) {
    errors.push(`${key} must be of type ${type}`);
    return errors;
  }

  if (enumValues && !enumValues.includes(value)) {
    errors.push(`${key} must be one of: ${enumValues.join(', ')}`);
  }

  if (typeof value === 'string') {
    if (minLength !== undefined && value.length < minLength) {
      errors.push(`${key} must be at least ${minLength} characters`);
    }
    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(`${key} must be no more than ${maxLength} characters`);
    }
    if (format === 'email' && !emailRegex.test(value)) {
      errors.push(`${key} must be a valid email address`);
    }
    if (pattern && !pattern.test(value)) {
      errors.push(`${key} has an invalid format`);
    }
  }

  if (typeof value === 'number') {
    if (min !== undefined && value < min) {
      errors.push(`${key} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      errors.push(`${key} must be no more than ${max}`);
    }
  }

  if (Array.isArray(value) && items) {
    value.forEach((entry, index) => {
      const nestedErrors = validateValue(`${key}[${index}]`, entry, items);
      errors.push(...nestedErrors);
    });
  }

  if (typeof custom === 'function') {
    const customResult = custom(value);
    if (typeof customResult === 'string' && customResult.length > 0) {
      errors.push(customResult);
    }
  }

  return errors;
};

const validateSegment = (segmentName, schema, payload) => {
  if (!schema) return [];
  if (!isObject(schema)) {
    throw new Error(`Schema for ${segmentName} must be an object`);
  }

  const errors = [];
  Object.entries(schema).forEach(([key, rule]) => {
    const value = payload?.[key];
    errors.push(...validateValue(`${segmentName}.${key}`, value, rule));
  });

  return errors;
};

export const validateRequest = (schema = {}) => (req, res, next) => {
  try {
    const errors = [
      ...validateSegment('body', schema.body, req.body),
      ...validateSegment('query', schema.query, req.query),
      ...validateSegment('params', schema.params, req.params),
    ].filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export default validateRequest;
