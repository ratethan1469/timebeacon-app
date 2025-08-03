/**
 * Input Validation and Sanitization Service
 * Provides comprehensive input validation and XSS protection
 */

import DOMPurify from 'isomorphic-dompurify';

export interface ValidationRule {
  required?: boolean;
  type?: 'email' | 'password' | 'text' | 'number' | 'url' | 'phone';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
  errorMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

class InputValidator {
  /**
   * Validate a single field
   */
  validateField(value: any, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = value;

    // Required check
    if (rules.required && this.isEmpty(value)) {
      errors.push(rules.errorMessage || 'This field is required');
      return { isValid: false, errors };
    }

    // Skip other validations if value is empty and not required
    if (this.isEmpty(value) && !rules.required) {
      return { isValid: true, errors: [], sanitizedValue: '' };
    }

    // Type-specific validation
    if (rules.type) {
      const typeValidation = this.validateType(value, rules.type);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors);
      }
      sanitizedValue = typeValidation.sanitizedValue || value;
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters long`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Must be no more than ${rules.maxLength} characters long`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.errorMessage || 'Invalid format');
    }

    // Custom validation
    if (rules.customValidator && !rules.customValidator(value)) {
      errors.push(rules.errorMessage || 'Invalid value');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
    };
  }

  /**
   * Validate multiple fields
   */
  validateForm(data: Record<string, any>, rules: Record<string, ValidationRule>): {
    isValid: boolean;
    errors: Record<string, string[]>;
    sanitizedData: Record<string, any>;
  } {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, any> = {};
    let isValid = true;

    for (const [field, fieldRules] of Object.entries(rules)) {
      const result = this.validateField(data[field], fieldRules);
      
      if (!result.isValid) {
        errors[field] = result.errors;
        isValid = false;
      }
      
      sanitizedData[field] = result.sanitizedValue;
    }

    return { isValid, errors, sanitizedData };
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Sanitize plain text input
   */
  sanitizeText(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate and sanitize SQL-like inputs
   */
  sanitizeSql(input: string): string {
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(--|\/\*|\*\/)/g,
      /(\bOR\b.*=.*\b)|(\bAND\b.*=.*\b)/gi,
      /(\bunion\b.*\bselect\b)/gi,
    ];

    let sanitized = input;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }

  /**
   * Validate specific input types
   */
  private validateType(value: any, type: string): ValidationResult {
    let sanitizedValue = value;
    const errors: string[] = [];

    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push('Please enter a valid email address');
        }
        sanitizedValue = this.sanitizeText(value);
        break;

      case 'password':
        if (value.length < 8) {
          errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(value)) {
          errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(value)) {
          errors.push('Password must contain at least one lowercase letter');
        }
        if (!/\d/.test(value)) {
          errors.push('Password must contain at least one number');
        }
        // Don't sanitize passwords
        sanitizedValue = value;
        break;

      case 'text':
        sanitizedValue = this.sanitizeText(value);
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push('Please enter a valid number');
        }
        sanitizedValue = num;
        break;

      case 'url':
        try {
          new URL(value);
          sanitizedValue = this.sanitizeText(value);
        } catch {
          errors.push('Please enter a valid URL');
        }
        break;

      case 'phone':
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(value)) {
          errors.push('Please enter a valid phone number');
        }
        sanitizedValue = value.replace(/[^\d\+\-\(\)\s]/g, '');
        break;

      default:
        sanitizedValue = this.sanitizeText(value);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
    };
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  }

  /**
   * Validate time entry data
   */
  validateTimeEntry(data: any): ValidationResult {
    const rules = {
      description: {
        required: true,
        type: 'text' as const,
        maxLength: 500,
        errorMessage: 'Description is required and must be less than 500 characters',
      },
      duration: {
        required: true,
        type: 'number' as const,
        customValidator: (value: number) => value > 0 && value <= 24 * 60, // Max 24 hours in minutes
        errorMessage: 'Duration must be between 1 minute and 24 hours',
      },
      projectId: {
        required: true,
        errorMessage: 'Project is required',
      },
      clientId: {
        required: false,
      },
    };

    return this.validateForm(data, rules);
  }

  /**
   * Validate project data
   */
  validateProject(data: any): ValidationResult {
    const rules = {
      name: {
        required: true,
        type: 'text' as const,
        maxLength: 100,
        errorMessage: 'Project name is required and must be less than 100 characters',
      },
      description: {
        required: false,
        type: 'text' as const,
        maxLength: 1000,
      },
      budget: {
        required: false,
        type: 'number' as const,
        customValidator: (value: number) => value >= 0,
        errorMessage: 'Budget must be a positive number',
      },
      hourlyRate: {
        required: false,
        type: 'number' as const,
        customValidator: (value: number) => value >= 0,
        errorMessage: 'Hourly rate must be a positive number',
      },
    };

    return this.validateForm(data, rules);
  }

  /**
   * Validate client data
   */
  validateClient(data: any): ValidationResult {
    const rules = {
      name: {
        required: true,
        type: 'text' as const,
        maxLength: 100,
        errorMessage: 'Client name is required and must be less than 100 characters',
      },
      email: {
        required: false,
        type: 'email' as const,
      },
      phone: {
        required: false,
        type: 'phone' as const,
      },
      website: {
        required: false,
        type: 'url' as const,
      },
    };

    return this.validateForm(data, rules);
  }
}

export const inputValidator = new InputValidator();