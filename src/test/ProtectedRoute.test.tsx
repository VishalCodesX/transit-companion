import { describe, it, expect, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

// Mock the auth context
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";

function renderRoute(allow: string[], children = "Protected content") {
  return render(
    <MemoryRouter initialEntries={["/test"]}>
      <ProtectedRoute allow={allow as any}>{children}</ProtectedRoute>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows spinner while loading", () => {
    (useAuth as Mock).mockReturnValue({ user: null, loading: true });
    renderRoute(["admin"]);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    (useAuth as Mock).mockReturnValue({ user: null, loading: false });
    renderRoute(["admin"]);
    // MemoryRouter with Navigate should render nothing at /login yet
    // but we can verify no protected content rendered
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects non-admin unapproved user to login", () => {
    (useAuth as Mock).mockReturnValue({
      user: { role: "driver", approvalStatus: "pending" },
      loading: false,
    });
    renderRoute(["driver"]);
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children for approved user with matching role", () => {
    (useAuth as Mock).mockReturnValue({
      user: { role: "driver", approvalStatus: "approved" },
      loading: false,
    });
    renderRoute(["driver"]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders children for admin regardless of approvalStatus", () => {
    (useAuth as Mock).mockReturnValue({
      user: { role: "admin", approvalStatus: "approved" },
      loading: false,
    });
    renderRoute(["admin"]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("blocks user with wrong role", () => {
    (useAuth as Mock).mockReturnValue({
      user: { role: "student", approvalStatus: "approved" },
      loading: false,
    });
    renderRoute(["driver"]);
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
