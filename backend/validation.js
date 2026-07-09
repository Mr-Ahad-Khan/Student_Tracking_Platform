import Joi from 'joi';

// Helper to validate MongoDB ObjectId hex strings
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
});

export const attendanceSchema = Joi.object({
  courseCode: Joi.string().trim().required().messages({
    'any.required': 'Course code is required',
  }),
  date: Joi.date().iso().required().messages({
    'date.format': 'Please provide a valid ISO date',
    'any.required': 'Date is required',
  }),
  records: Joi.array().items(
    Joi.object({
      student: Joi.string().regex(objectIdPattern).required().messages({
        'string.pattern.base': 'Invalid student identifier format',
        'any.required': 'Student ID is required',
      }),
      status: Joi.string().valid('Present', 'Absent', 'Late').required().messages({
        'any.only': 'Attendance status must be Present, Absent, or Late',
        'any.required': 'Status is required',
      }),
    })
  ).min(1).required().messages({
    'array.min': 'At least one student record is required',
    'any.required': 'Attendance records are required',
  }),
});

export const marksSchema = Joi.object({
  studentId: Joi.string().regex(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid student identifier format',
    'any.required': 'Student ID is required',
  }),
  courseCode: Joi.string().trim().required().messages({
    'any.required': 'Course code is required',
  }),
  courseName: Joi.string().trim().required().messages({
    'any.required': 'Course name is required',
  }),
  score: Joi.number().min(0).max(100).required().messages({
    'number.min': 'Score cannot be less than 0',
    'number.max': 'Score cannot exceed 100',
    'any.required': 'Score is required',
  }),
  grade: Joi.string().trim().required().messages({
    'any.required': 'Grade is required',
  }),
});

export const leaveRequestSchema = Joi.object({
  startDate: Joi.date().required().messages({
    'any.required': 'Start date is required',
  }),
  endDate: Joi.date().min(Joi.ref('startDate')).required().messages({
    'date.min': 'End date must be greater than or equal to start date',
    'any.required': 'End date is required',
  }),
  reason: Joi.string().trim().min(5).required().messages({
    'string.min': 'Reason must be at least 5 characters long',
    'any.required': 'Reason is required',
  }),
});

export const feesUpdateSchema = Joi.object({
  feesPaid: Joi.boolean().required().messages({
    'any.required': 'Fees paid status (true/false) is required',
  }),
});
