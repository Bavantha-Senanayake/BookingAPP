import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

export const validateReservationCreate = [
  body("resourceId")
    .notEmpty()
    .withMessage("Resource ID is required")
    .isString()
    .withMessage("Resource ID must be a string")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid resource ID format");
      }
      return true;
    }),

  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isString()
    .withMessage("User ID must be a string")
    .trim(),

  body("startTime")
    .notEmpty()
    .withMessage("Start time is required")
    .isISO8601()
    .withMessage("Start time must be a valid ISO 8601 date")
    .custom((value) => {
      const startTime = new Date(value);
      const now = new Date();
      if (startTime < now) {
        throw new Error("Start time cannot be in the past");
      }
      return true;
    }),

  body("endTime")
    .notEmpty()
    .withMessage("End time is required")
    .isISO8601()
    .withMessage("End time must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      const startTime = new Date(req.body.startTime);
      const endTime = new Date(value);
      if (endTime <= startTime) {
        throw new Error("End time must be after start time");
      }

      return true;
    }),

  handleValidationErrors,
];

export const validateReservationGet = [
  query("resourceId")
    .optional()
    .isString()
    .withMessage("Resource ID must be a string")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid resource ID format");
      }
      return true;
    }),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100 and positive integer"),

  handleValidationErrors,
];

export const validateReservationCancel = [
  param("id")
    .optional()
    .isString()
    .withMessage("Resource ID must be a string")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid resource ID format");
      }
      return true;
    }),
  handleValidationErrors,
];
