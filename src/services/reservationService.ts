import Reservation from "../models/Reservation";
import ResourceLock from "../models/ResourceLock";
import mongoose from "mongoose";

const MAX_RETRIES = 5;
const LOCK_TIMEOUT_MS = 500;

const acquireResourceLock = async (
  resourceId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> => {
  const expiresAt = new Date(Date.now() + LOCK_TIMEOUT_MS);

  await ResourceLock.findOneAndUpdate(
    {
      resourceId,
      $or: [{ expiresAt: { $lt: new Date() } }, { _id: { $exists: false } }],
    },
    {
      $set: {
        lockedAt: new Date(),
        expiresAt,
      },
      $setOnInsert: { resourceId },
    },
    {
      upsert: true,
      session,
      new: true,
    }
  );
};

const releaseResourceLock = async (
  resourceId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> => {
  await ResourceLock.deleteOne({ resourceId }, { session });
};

export const checkReservationOverlap = async (
  resourceId: mongoose.Types.ObjectId,
  startTime: Date,
  endTime: Date,
  session?: mongoose.ClientSession
): Promise<boolean> => {
  const query: any = {
    resourceId,
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
  };

  let queryBuilder = Reservation.findOne(query);
  if (session) {
    queryBuilder = queryBuilder.session(session);
  }

  const overlappingReservation = await queryBuilder;
  return overlappingReservation !== null;
};

export const createReservation = async (
  resourceId: mongoose.Types.ObjectId,
  userId: string,
  startTime: Date,
  endTime: Date
) => {
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      });

      await acquireResourceLock(resourceId, session);

      const hasOverlap = await checkReservationOverlap(
        resourceId,
        startTime,
        endTime,
        session
      );

      if (hasOverlap) {
        await releaseResourceLock(resourceId, session);
        throw new Error("This time slot overlaps with an existing reservation");
      }

      const reservation = new Reservation({
        resourceId,
        userId,
        startTime,
        endTime,
      });

      await reservation.save({ session });

      await releaseResourceLock(resourceId, session);
      await session.commitTransaction();

      return reservation;
    } catch (error: any) {
      await session.abortTransaction();
      lastError = error;

      if (error.code === 11000) {
        throw new Error("This time slot overlaps with an existing reservation");
      }

      if (error.code === 112 && attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }

      if (
        error.message?.includes("duplicate key") &&
        error.message?.includes("ResourceLock") &&
        attempt < MAX_RETRIES - 1
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * (attempt + 1))
        );
        continue;
      }

      if (error.message?.includes("overlap")) {
        throw error;
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  throw (
    lastError ||
    new Error("Failed to create reservation after multiple attempts")
  );
};
