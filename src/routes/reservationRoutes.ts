import { Router } from "express";
import {
  createReservation,
  listReservations,
  cancelReservation,
} from "../controllers/reservationController";
import {
  validateReservationCreate,
  validateReservationGet,
  validateReservationCancel,
} from "../middleware/validator";

const router = Router();

/**
 * @route   POST /reservations
 * @desc    Create a new reservation
 */
router.post("/", validateReservationCreate, createReservation);

/**
 * @route   GET /reservations
 * @desc    List all reservations with optional filtering and pagination
 */
router.get("/", validateReservationGet, listReservations);

/**
 * @route   DELETE /reservations/:id
 * @desc    Cancel a reservation
 */
router.delete("/:id", validateReservationCancel, cancelReservation);

export default router;
