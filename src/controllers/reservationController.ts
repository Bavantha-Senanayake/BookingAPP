import { Request, Response, NextFunction } from "express";
import Reservation from "../models/Reservation";
import Resource from "../models/Resource";
import * as reservationService from "../services/reservationService";

export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { resourceId, userId, startTime, endTime } = req.body;

    const resource = await Resource.findById(resourceId);

    if (!resource) {
      res.status(404).json({
        success: false,
        error: "Resource not found",
      });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const reservation = await reservationService.createReservation(
      resourceId,
      userId,
      start,
      end
    );

    res.status(201).json({
      success: true,
      data: {
        id: reservation._id,
        resourceId: reservation.resourceId,
        userId: reservation.userId,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        createdAt: reservation.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message.includes("overlap")) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
    } else if (
      error.message.includes("past") ||
      error.message.includes("after") ||
      error.message.includes("duration")
    ) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      next(error);
    }
  }
};

export const listReservations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      resourceId,
      page = "1",
      limit = "10",
      startDate,
      endDate,
    } = req.query;

    const query: any = {};

    if (resourceId) {
      query.resourceId = resourceId;
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [reservations, total] = await Promise.all([
      Reservation.find(query)
        .populate("resourceId", "name")
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reservation.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: reservations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByIdAndDelete(id);

    if (!reservation) {
      res.status(404).json({
        success: false,
        error: "Reservation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Reservation cancelled successfully",
      data: {
        id: reservation._id,
        resourceId: reservation.resourceId,
        userId: reservation.userId,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
      },
    });
  } catch (error) {
    next(error);
  }
};
