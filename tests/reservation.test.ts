import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import Reservation from "../src/models/Reservation";
import Resource from "../src/models/Resource";
import {
  checkReservationOverlap,
  createReservation,
} from "../src/services/reservationService";

let mongoServer: MongoMemoryReplSet;
let testResourceId: mongoose.Types.ObjectId;

// Setup in-memory MongoDB Replica Set (required for transactions)
beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create a test resource
  const resource = await Resource.create({ name: "Test Room" });
  testResourceId = resource._id as mongoose.Types.ObjectId;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear reservations before each test
  await Reservation.deleteMany({});
});

describe("Overlap Detection", () => {
  it("should detect no overlap for adjacent time slots", async () => {
    // Create first reservation: 10:00-12:00
    await Reservation.create({
      resourceId: testResourceId,
      userId: "user-1",
      startTime: new Date("2025-12-20T10:00:00Z"),
      endTime: new Date("2025-12-20T12:00:00Z"),
    });

    // Check if 12:00-14:00 overlaps (should not)
    const hasOverlap = await checkReservationOverlap(
      testResourceId,
      new Date("2025-12-20T12:00:00Z"),
      new Date("2025-12-20T14:00:00Z")
    );

    expect(hasOverlap).toBe(false);
  });

  it("should detect overlap when new reservation starts during existing", async () => {
    // Existing: 10:00-12:00
    await Reservation.create({
      resourceId: testResourceId,
      userId: "user-1",
      startTime: new Date("2025-12-20T10:00:00Z"),
      endTime: new Date("2025-12-20T12:00:00Z"),
    });

    // Check if 11:00-13:00 overlaps (should overlap)
    const hasOverlap = await checkReservationOverlap(
      testResourceId,
      new Date("2025-12-20T11:00:00Z"),
      new Date("2025-12-20T13:00:00Z")
    );

    expect(hasOverlap).toBe(true);
  });

  it("should detect overlap when new reservation contains existing", async () => {
    // Existing: 10:00-11:00
    await Reservation.create({
      resourceId: testResourceId,
      userId: "user-1",
      startTime: new Date("2025-12-20T10:00:00Z"),
      endTime: new Date("2025-12-20T11:00:00Z"),
    });

    // Check if 09:00-12:00 overlaps (contains existing)
    const hasOverlap = await checkReservationOverlap(
      testResourceId,
      new Date("2025-12-20T09:00:00Z"),
      new Date("2025-12-20T12:00:00Z")
    );

    expect(hasOverlap).toBe(true);
  });

  it("should detect overlap when new reservation is contained within existing", async () => {
    // Existing: 08:00-12:00
    await Reservation.create({
      resourceId: testResourceId,
      userId: "user-1",
      startTime: new Date("2025-12-20T08:00:00Z"),
      endTime: new Date("2025-12-20T12:00:00Z"),
    });

    // Check if 09:00-11:00 overlaps (contained within)
    const hasOverlap = await checkReservationOverlap(
      testResourceId,
      new Date("2025-12-20T09:00:00Z"),
      new Date("2025-12-20T11:00:00Z")
    );

    expect(hasOverlap).toBe(true);
  });

  it("should not detect overlap for different resources", async () => {
    const anotherResource = await Resource.create({ name: "Another Room" });

    // Create reservation for first resource
    await Reservation.create({
      resourceId: testResourceId,
      userId: "user-1",
      startTime: new Date("2025-12-20T10:00:00Z"),
      endTime: new Date("2025-12-20T12:00:00Z"),
    });

    // Check overlap for different resource (should not overlap)
    const hasOverlap = await checkReservationOverlap(
      anotherResource._id as mongoose.Types.ObjectId,
      new Date("2025-12-20T10:00:00Z"),
      new Date("2025-12-20T12:00:00Z")
    );

    expect(hasOverlap).toBe(false);
  });
});

// Validation tests removed - now handled by express-validator middleware

describe("Concurrent Booking with Transactions", () => {
  it("should prevent double-booking when two users book simultaneously", async () => {
    const startTime = new Date("2025-12-20T10:00:00Z");
    const endTime = new Date("2025-12-20T12:00:00Z");

    // Simulate two concurrent booking attempts
    const bookingPromises = [
      createReservation(testResourceId, "user-A", startTime, endTime),
      createReservation(testResourceId, "user-B", startTime, endTime),
    ];

    // Execute concurrently
    const results = await Promise.allSettled(bookingPromises);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    // With pessimistic locking: Exactly ONE should succeed
    console.log(
      `\n  ✅ Concurrency Test Result: ${succeeded.length} succeeded, ${failed.length} failed`
    );

    // Verify exactly one reservation exists
    const reservations = await Reservation.find({ resourceId: testResourceId });
    console.log(
      `  📊 Database state: ${reservations.length} reservation(s) created (expected: 1)\n`
    );

    // Verify only one booking succeeded
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(reservations.length).toBe(1);

    // Verify the failed one has appropriate error
    const failedResult = failed[0] as PromiseRejectedResult;
    expect(failedResult.reason.message).toMatch(
      /overlap|locked|after multiple attempts/i
    );
  });

  it("should handle multiple concurrent bookings for different time slots", async () => {
    // Create 5 concurrent bookings for different time slots
    const bookingPromises = [
      createReservation(
        testResourceId,
        "user-1",
        new Date("2025-12-20T08:00:00Z"),
        new Date("2025-12-20T10:00:00Z")
      ),
      createReservation(
        testResourceId,
        "user-2",
        new Date("2025-12-20T10:00:00Z"),
        new Date("2025-12-20T12:00:00Z")
      ),
      createReservation(
        testResourceId,
        "user-3",
        new Date("2025-12-20T12:00:00Z"),
        new Date("2025-12-20T14:00:00Z")
      ),
      createReservation(
        testResourceId,
        "user-4",
        new Date("2025-12-20T14:00:00Z"),
        new Date("2025-12-20T16:00:00Z")
      ),
      createReservation(
        testResourceId,
        "user-5",
        new Date("2025-12-20T16:00:00Z"),
        new Date("2025-12-20T18:00:00Z")
      ),
    ];

    const results = await Promise.allSettled(bookingPromises);

    // All should succeed (no overlap)
    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded.length).toBe(5);

    // Verify all 5 reservations exist
    const reservations = await Reservation.find({ resourceId: testResourceId });
    expect(reservations.length).toBe(5);
  });

  it("should prevent double-booking in high concurrency scenario", async () => {
    const startTime = new Date("2025-12-20T10:00:00Z");
    const endTime = new Date("2025-12-20T12:00:00Z");

    // Simulate 10 users trying to book the same slot
    const bookingPromises = Array.from({ length: 10 }, (_, i) =>
      createReservation(testResourceId, `user-${i}`, startTime, endTime)
    );

    const results = await Promise.allSettled(bookingPromises);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    console.log(
      `\n  ✅ High Concurrency: ${succeeded.length}/10 booking succeeded, ${failed.length} failed`
    );

    // Verify actual state
    const reservations = await Reservation.find({ resourceId: testResourceId });
    console.log(
      `  📊 Database: ${reservations.length} reservation created (correct!)\n`
    );

    // With pessimistic locking, only ONE should succeed
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(9);
    expect(reservations.length).toBe(1);
  });

  it("should handle partial overlap scenarios correctly", async () => {
    // First reservation: 10:00-12:00
    await createReservation(
      testResourceId,
      "user-1",
      new Date("2025-12-20T10:00:00Z"),
      new Date("2025-12-20T12:00:00Z")
    );

    // Try to book overlapping slots concurrently
    const overlappingBookings = [
      createReservation(
        testResourceId,
        "user-2",
        new Date("2025-12-20T09:00:00Z"),
        new Date("2025-12-20T11:00:00Z")
      ), // Overlaps start
      createReservation(
        testResourceId,
        "user-3",
        new Date("2025-12-20T11:00:00Z"),
        new Date("2025-12-20T13:00:00Z")
      ), // Overlaps end
      createReservation(
        testResourceId,
        "user-4",
        new Date("2025-12-20T10:30:00Z"),
        new Date("2025-12-20T11:30:00Z")
      ), // Contained within
    ];

    const results = await Promise.allSettled(overlappingBookings);

    // All should fail due to overlap
    const failed = results.filter((r) => r.status === "rejected");
    expect(failed.length).toBe(3);

    // Still only 1 reservation
    const reservations = await Reservation.find({ resourceId: testResourceId });
    expect(reservations.length).toBe(1);
  });
});
