import { test, expect } from "@playwright/test";
import { runUserFlow } from "passmark";
import { STUDENT_USER } from "../utils/fixtures";
import { createPresentlyState, installPresentlyBackend } from "../utils/mock-presently";

test("AI chaos exploration tries to break Presently attendance rules", async ({ page }) => {
  const state = createPresentlyState({ attendances: [] });
  state.currentUser = STUDENT_USER;
  await installPresentlyBackend(page, state);

  await page.goto("/dashboard");

  await runUserFlow({
    page,
    userFlow: "Try to break Presently by abusing attendance check-in, switching routes, logging out mid-flow, and attempting to reach restricted lecturer pages.",
    steps: "Use the dashboard, open the scanner, try repeated submissions, manually change URLs, sign out, sign back in, and look for any way to bypass the attendance rules or duplicate a record.",
    effort: "high",
  });

  expect(state.attendances.filter((record) => record.student === STUDENT_USER.id).length).toBeLessThanOrEqual(1);
});
