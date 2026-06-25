import { describe, it, expect } from "vitest";
import {
  ROLES,
  BUS_STATUS,
  TRIP_STATUS,
  ROLE_HOME,
  GPS_THROTTLE_METERS,
  GPS_THROTTLE_MS,
  BUS_STALE_MS,
  type Role,
  type BusStatus,
} from "@/utils/constants";

describe("constants", () => {
  it("ROLES has correct keys", () => {
    expect(ROLES.DRIVER).toBe("driver");
    expect(ROLES.STUDENT).toBe("student");
    expect(ROLES.ADMIN).toBe("admin");
  });

  it("BUS_STATUS has correct keys", () => {
    expect(BUS_STATUS.ACTIVE).toBe("active");
    expect(BUS_STATUS.IDLE).toBe("idle");
    expect(BUS_STATUS.OFFLINE).toBe("offline");
  });

  it("TRIP_STATUS has correct keys", () => {
    expect(TRIP_STATUS.ONGOING).toBe("ongoing");
    expect(TRIP_STATUS.COMPLETED).toBe("completed");
  });

  it("ROLE_HOME maps each role to a path", () => {
    expect(ROLE_HOME.driver).toBe("/driver");
    expect(ROLE_HOME.student).toBe("/student");
    expect(ROLE_HOME.admin).toBe("/admin");
  });

  it("GPS throttle constants are reasonable", () => {
    expect(GPS_THROTTLE_METERS).toBeGreaterThan(0);
    expect(GPS_THROTTLE_MS).toBeGreaterThan(0);
    expect(GPS_THROTTLE_MS).toBeLessThanOrEqual(30_000);
  });

  it("BUS_STALE_MS is at least 60s", () => {
    expect(BUS_STALE_MS).toBeGreaterThanOrEqual(60_000);
  });
});
