import { describe, it, expect } from "vitest";
import { distanceMeters, bearing, speedKmh } from "@/utils/mapUtils";

describe("distanceMeters", () => {
  it("returns 0 for same point", () => {
    expect(distanceMeters(13.0, 80.0, 13.0, 80.0)).toBe(0);
  });

  it("calculates known distance correctly", () => {
    // ~111km per degree of lat at equator
    const d = distanceMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("is symmetric", () => {
    const a = distanceMeters(13.0, 80.0, 14.0, 81.0);
    const b = distanceMeters(14.0, 81.0, 13.0, 80.0);
    expect(a).toBeCloseTo(b, 6);
  });

  it("handles negative coordinates", () => {
    const d = distanceMeters(-33.86, 151.21, 40.71, -74.01);
    expect(d).toBeGreaterThan(15_000_000); // Sydney to NYC ~16k km
  });
});

describe("bearing", () => {
  it("returns 0 for northward movement", () => {
    expect(bearing(0, 0, 1, 0)).toBeCloseTo(0, 1);
  });

  it("returns 90 for eastward movement", () => {
    expect(bearing(0, 0, 0, 1)).toBeCloseTo(90, 1);
  });

  it("returns 180 for southward movement", () => {
    expect(bearing(1, 0, 0, 0)).toBeCloseTo(180, 1);
  });

  it("returns value in 0-360 range", () => {
    const b = bearing(0, 0, -1, -1);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("speedKmh", () => {
  it("returns 0 for zero time", () => {
    expect(speedKmh(100, 0)).toBe(0);
  });

  it("returns 0 for negative time", () => {
    expect(speedKmh(100, -1)).toBe(0);
  });

  it("converts m/ms to km/h", () => {
    // 10 meters in 1000ms = 36 km/h
    expect(speedKmh(10, 1000)).toBeCloseTo(36, 1);
  });

  it("calculates highway speed", () => {
    // 27.78 meters in 1000ms = 100 km/h
    expect(speedKmh(27.78, 1000)).toBeCloseTo(100, 0);
  });
});
