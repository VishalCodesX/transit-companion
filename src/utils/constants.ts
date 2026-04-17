export const ROLES = {
  DRIVER: "driver",
  STUDENT: "student",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const BUS_STATUS = {
  ACTIVE: "active",
  IDLE: "idle",
  OFFLINE: "offline",
} as const;

export type BusStatus = (typeof BUS_STATUS)[keyof typeof BUS_STATUS];

export const TRIP_STATUS = {
  ONGOING: "ongoing",
  COMPLETED: "completed",
} as const;

/** Default redirect path for a given role */
export const ROLE_HOME: Record<Role, string> = {
  driver: "/driver",
  student: "/student",
  admin: "/admin",
};

/** GPS throttle defaults */
export const GPS_THROTTLE_METERS = 10;
export const GPS_THROTTLE_MS = 8000;
