import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";
import { createPresentlyState, installPresentlyBackend } from "../utils/mock-presently";

test.describe("Student attendance flow", () => {
  test("a student can log in from a check-in link and mark attendance once", async ({ page }) => {
    const state = createPresentlyState({ attendances: [] });
    await installPresentlyBackend(page, state);

    await page.goto("/check-in/ABCD1234");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Student logs in from a check-in link and completes attendance",
      steps: [
        { description: "Open the attendance link and reach the login screen" },
        { description: "Sign in as Alice Student with the test student account" },
        { description: "Let the app return to the session and finish marking attendance" },
      ],
      assertions: [
        { assertion: "the app should end on the dashboard after a successful check-in" },
        { assertion: "only one attendance record should exist for Alice Student in session ABCD1234" },
      ],
    });

    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
    expect(state.attendances.filter((record) => record.session === 1 && record.student === "student-uuid-001")).toHaveLength(1);
  });

  test("the dashboard reflects the newly marked attendance after the session completes", async ({ page }) => {
    const state = createPresentlyState({ attendances: [] });
    await installPresentlyBackend(page, state);

    await page.goto("/check-in/ABCD1234");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Student signs in and watches the dashboard update after attendance is accepted",
      steps: [
        { description: "Log in as Alice Student from the attendance link" },
        { description: "Wait for the automatic attendance submission to succeed" },
      ],
      assertions: [
        { assertion: "the dashboard should show the new attendance activity" },
      ],
    });

    await expect(page.getByText(/Marked present for Data Structures/i)).toBeVisible();
    expect(state.studentDashboard.recent_activity[0].course_code).toBe("CS301");
  });
});
