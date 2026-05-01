import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";
import { STUDENT_USER, SOON_TO_EXPIRE_SESSION } from "../utils/fixtures";
import { createPresentlyState, installPresentlyBackend } from "../utils/mock-presently";

test.describe("Attendance edge cases", () => {
  test("the scanner rejects malformed session codes before it talks to the backend", async ({ page }) => {
    const state = createPresentlyState({ attendances: [] });
    state.currentUser = STUDENT_USER;
    await installPresentlyBackend(page, state);

    await page.goto("/dashboard");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Student tries to use the scanner without providing a valid session code",
      steps: [
        { description: "Open the attendance scanner from the dashboard" },
        { description: "Switch to keyboard entry so a code can be typed manually" },
      ],
      assertions: [
        { assertion: "the scanner should reject the invalid code immediately" },
        { assertion: "no attendance record should be created" },
      ],
    });

    await page.getByPlaceholder("••••••••").fill("MISSING1");
    await page.getByRole("button", { name: /validate session code/i }).click();
    await expect(page.getByText(/session not found|invalid session|validation error/i)).toBeVisible();
    expect(state.attendances).toHaveLength(0);
  });

  test("attendance near the deadline is rejected once the session closes", async ({ page }) => {
    const state = createPresentlyState({
      sessions: [SOON_TO_EXPIRE_SESSION],
      attendances: [],
      checkInMode: "outside-time",
      checkInDelayMs: 1200,
    });
    await installPresentlyBackend(page, state);

    await page.goto("/check-in/BOUND123");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Student attempts to submit attendance at the deadline boundary",
      steps: [
        { description: "Log in and return to the boundary-time attendance link" },
        { description: "Wait for the session to close while the submission is in flight" },
      ],
      assertions: [
        { assertion: "the system should reject the submission because the session closed" },
        { assertion: "no attendance record should be written" },
      ],
    });

    await expect(page.getByText(/attendance session has closed/i)).toBeVisible();
    expect(state.attendances).toHaveLength(0);
  });

  test("refreshing the page during submission does not create inconsistent attendance data", async ({ page }) => {
    const state = createPresentlyState({ attendances: [] });
    state.currentUser = STUDENT_USER;
    state.checkInDelayMs = 1500;
    await installPresentlyBackend(page, state);

    await page.goto("/dashboard");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Student starts a check-in and refreshes the page while the submission is still in flight",
      steps: [
        { description: "Open the scanner from the dashboard" },
        { description: "Switch to keyboard entry so the session code can be filled manually" },
      ],
      assertions: [
        { assertion: "the app should remain stable after the refresh" },
      ],
    });

    await page.getByPlaceholder("••••••••").fill("ABCD1234");
    const submit = page.getByRole("button", { name: /validate session code/i });
    await Promise.all([
      submit.click({ force: true }),
      page.reload(),
    ]);

    await page.waitForTimeout(1800);
    expect(state.counters.checkIn).toBe(1);
    expect(state.attendances.filter((record) => record.session === 1)).toHaveLength(1);
  });
});
