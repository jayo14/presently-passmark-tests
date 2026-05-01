import { Page, Route } from "@playwright/test";
import {
  ACTIVE_ATTENDANCE,
  ACTIVE_SESSION,
  ADMIN_USER,
  CLASS_REP_USER,
  clone,
  COURSE_ANALYTICS,
  COURSE_DATABASE_SYSTEMS,
  COURSE_DATA_STRUCTURES,
  LECTURER_DASHBOARD,
  LECTURER_USER,
  MAIN_VENUE,
  PresentlyAttendance,
  PresentlyCourse,
  PresentlyRole,
  PresentlySession,
  PresentlyUser,
  PresentlyVenue,
  SECOND_VENUE,
  SOON_TO_EXPIRE_SESSION,
  STUDENT_DASHBOARD,
  STUDENT_USER,
  STUDENT_USER_2,
  EXPIRED_SESSION,
  createAttendanceRecord,
} from "./fixtures";

export interface PresentlyState {
  currentUser: PresentlyUser | null;
  sessions: PresentlySession[];
  attendances: PresentlyAttendance[];
  courses: PresentlyCourse[];
  venues: PresentlyVenue[];
  enrollments: Array<{ student: string; course: number; is_active: boolean }>;
  courseAnalytics: typeof COURSE_ANALYTICS;
  studentDashboard: typeof STUDENT_DASHBOARD;
  lecturerDashboard: typeof LECTURER_DASHBOARD;
  counters: {
    login: number;
    checkIn: number;
    exports: number;
    manualMarks: number;
  };
  checkInMode: "success" | "outside-time" | "outside-location" | "rate-limited";
  checkInDelayMs: number;
  forceSlowSubmission: boolean;
}

const defaultState: PresentlyState = {
  currentUser: null,
  sessions: [ACTIVE_SESSION, SOON_TO_EXPIRE_SESSION, EXPIRED_SESSION],
  attendances: [ACTIVE_ATTENDANCE],
  courses: [COURSE_DATA_STRUCTURES, COURSE_DATABASE_SYSTEMS],
  venues: [MAIN_VENUE, SECOND_VENUE],
  enrollments: [{ student: STUDENT_USER.id, course: ACTIVE_SESSION.course, is_active: true }],
  courseAnalytics: COURSE_ANALYTICS,
  studentDashboard: STUDENT_DASHBOARD,
  lecturerDashboard: LECTURER_DASHBOARD,
  counters: {
    login: 0,
    checkIn: 0,
    exports: 0,
    manualMarks: 0,
  },
  checkInMode: "success",
  checkInDelayMs: 0,
  forceSlowSubmission: false,
};

export const createPresentlyState = (overrides: Partial<PresentlyState> = {}): PresentlyState => {
  const state = clone(defaultState);
  return {
    ...state,
    ...overrides,
    counters: {
      ...state.counters,
      ...(overrides.counters || {}),
    },
  };
};

export const createPageUser = (role: PresentlyRole): PresentlyUser => {
  switch (role) {
    case "LECTURER":
      return clone(LECTURER_USER);
    case "ADMIN":
      return clone(ADMIN_USER);
    case "CLASS_REP":
      return clone(CLASS_REP_USER);
    case "STUDENT":
    default:
      return clone(STUDENT_USER);
  }
};

const json = async (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const readJson = (route: Route): Record<string, any> => {
  try {
    return route.request().postDataJSON() as Record<string, any>;
  } catch {
    return {};
  }
};

const resolveUserFromEmail = (email: string, fallback: PresentlyUser | null): PresentlyUser => {
  const normalized = email.toLowerCase();
  if (normalized.includes("lecturer")) return clone(LECTURER_USER);
  if (normalized.includes("admin")) return clone(ADMIN_USER);
  if (normalized.includes("rep")) return clone(CLASS_REP_USER);
  if (normalized.includes("student2")) return clone(STUDENT_USER_2);
  if (normalized.includes("student")) return clone(STUDENT_USER);
  return clone(fallback || STUDENT_USER);
};

const pickSession = (state: PresentlyState, codeOrId: string) =>
  state.sessions.find(
    (session) =>
      session.session_code.toUpperCase() === codeOrId.toUpperCase() ||
      String(session.id) === codeOrId,
  );

const filterCourses = (state: PresentlyState, params: URLSearchParams) => {
  const department = params.get("department");
  const lecturer = params.get("lecturer");
  return state.courses.filter((course) => {
    if (department && !course.department.includes(Number(department))) return false;
    if (lecturer && String(course.lecturer) !== lecturer) return false;
    return true;
  });
};

const filterSessions = (state: PresentlyState, params: URLSearchParams) => {
  const course = params.get("course");
  const active = params.get("active");
  return state.sessions.filter((session) => {
    if (course && String(session.course) !== course) return false;
    if (active && active === "true" && !session.is_active) return false;
    return true;
  });
};

const filterAttendances = (state: PresentlyState, params: URLSearchParams) => {
  const session = params.get("session");
  const student = params.get("student");
  return state.attendances.filter((record) => {
    if (session && String(record.session) !== session) return false;
    if (student && record.student !== student) return false;
    return true;
  });
};

const buildCheckInResponse = (state: PresentlyState, session: PresentlySession, body: Record<string, any>) => {
  state.counters.checkIn += 1;

  if (!state.currentUser) {
    return { status: 401, body: { error: "Authentication required" } };
  }

  if (state.checkInMode === "rate-limited" && state.counters.checkIn > 1) {
    return { status: 429, body: { error: "Too many check-in attempts" } };
  }

  if (state.checkInMode === "outside-location") {
    return { status: 403, body: { error: "You are outside geofence" } };
  }

  if (
    state.checkInMode === "outside-time" ||
    !session.is_active ||
    Date.now() < new Date(session.start_time).getTime() ||
    Date.now() > new Date(session.end_time).getTime()
  ) {
    return { status: 403, body: { error: "Attendance session has closed" } };
  }

  const alreadyMarked = state.attendances.some(
    (attendance) => attendance.session === session.id && attendance.student === state.currentUser?.id,
  );

  if (alreadyMarked) {
    return { status: 409, body: { error: "You have already marked attendance for this session" } };
  }

  const created = createAttendanceRecord({
    id: state.attendances.length + 1,
    session: session.id,
    student: state.currentUser.id,
    student_name: state.currentUser.full_name,
    student_matric: state.currentUser.matric_number || "MAT/2021/001",
    student_department: state.currentUser.department || "Computer Science",
    course_code: session.course_code,
    checked_in_at: new Date().toISOString(),
    latitude: Number(body.latitude ?? session.latitude),
    longitude: Number(body.longitude ?? session.longitude),
    location_verified: true,
    distance_from_venue: 18,
  });

  state.attendances.unshift(created);
  session.attendee_count = state.attendances.filter((attendance) => attendance.session === session.id).length;
  state.studentDashboard.recent_activity.unshift({
    id: state.studentDashboard.recent_activity.length + 1,
    type: "attendance",
    course_code: session.course_code,
    course_name: session.course_name,
    timestamp: created.checked_in_at,
    status: "PRESENT",
    description: `Marked present for ${session.course_name}`,
  } as any);
  state.studentDashboard.attendance_stats.total_present += 1;
  state.studentDashboard.attendance_stats.average_attendance = Math.min(100, state.studentDashboard.attendance_stats.average_attendance + 1);

  return {
    status: 201,
    body: {
      success: true,
      attendance: created,
    },
  };
};

const buildCourseAnalytics = (state: PresentlyState, courseId: number) => {
  const seeded = state.courseAnalytics[courseId];
  if (seeded) return seeded;

  const students = state.attendances
    .filter((attendance) => attendance.course_code === COURSE_DATA_STRUCTURES.code)
    .map((attendance) => ({
      id: attendance.student,
      matric_number: attendance.student_matric,
      full_name: attendance.student_name,
      total_sessions: 1,
      sessions_attended: 1,
      attendance_rate: 100,
      status: "Present" as const,
      name: attendance.student_name,
      matric: attendance.student_matric,
      department: attendance.student_department,
      level: "300",
      attended: 1,
      total: 1,
      percentage: 100,
    }));

  return {
    course_id: courseId,
    course_code: COURSE_DATA_STRUCTURES.code,
    course_name: COURSE_DATA_STRUCTURES.title,
    lecturer: LECTURER_USER.full_name,
    total_sessions: state.sessions.length,
    students,
    avg_attendance: 100,
    at_risk_count: 0,
    good_standing_count: students.length,
    benchmark: 75,
  };
};

export async function installPresentlyBackend(
  page: Page,
  state: PresentlyState,
): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const body = readJson(route);

    if (path.endsWith("/health/") || path.endsWith("/warmup/")) {
      await json(route, 200, { ok: true });
      return;
    }

    if (path.endsWith("/auth/me/")) {
      await json(route, 200, { user: state.currentUser });
      return;
    }

    if (path.endsWith("/auth/login/") && method === "POST") {
      state.counters.login += 1;
      const user = resolveUserFromEmail(body.email || "", state.currentUser);
      state.currentUser = user;
      await json(route, 200, {
        success: true,
        message: "Login successful",
        user,
        tokens: {
          access: `access-${user.role.toLowerCase()}-${state.counters.login}`,
          refresh: `refresh-${user.role.toLowerCase()}-${state.counters.login}`,
        },
        requires_onboarding: false,
      });
      return;
    }

    if (path.endsWith("/auth/logout/") && method === "POST") {
      state.currentUser = null;
      await json(route, 200, {});
      return;
    }

    if (path.endsWith("/auth/token/refresh/") && method === "POST") {
      const user = state.currentUser || STUDENT_USER;
      await json(route, 200, { access: `refresh-access-${user.role.toLowerCase()}`, refresh: "refresh-token" });
      return;
    }

    if (path.endsWith("/auth/onboarding/") && method === "POST") {
      await json(route, 200, {
        success: true,
        message: "Onboarding completed successfully",
        user: { ...(state.currentUser || STUDENT_USER), onboarding_complete: true },
      });
      return;
    }

    if (path.endsWith("/courses/") && method === "GET") {
      await json(route, 200, { results: filterCourses(state, url.searchParams), count: filterCourses(state, url.searchParams).length });
      return;
    }

    if (path.endsWith("/venues/active_sessions/")) {
      await json(route, 200, { success: true, active_venue_ids: state.sessions.filter((session) => session.is_active).map((session) => session.venue) });
      return;
    }

    if (path.endsWith("/venues/") && method === "GET") {
      await json(route, 200, { results: state.venues, count: state.venues.length });
      return;
    }

    if (path.endsWith("/institutions/") && method === "GET") {
      await json(route, 200, {
        results: [
          {
            id: 1,
            full_name: "Presently University",
            short_name: "PU",
            abbreviation: "PU",
            country: "Nigeria",
            city: "Ile-Ife",
            address: "Main Campus",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        count: 1,
      });
      return;
    }

    if (path.endsWith("/colleges/") && method === "GET") {
      await json(route, 200, {
        results: [{ id: 1, name: "College of Science", code: "COS", institution: 1 }],
        count: 1,
      });
      return;
    }

    if (path.endsWith("/departments/") && method === "GET") {
      await json(route, 200, {
        results: [
          { id: 1, name: "Computer Science", code: "CSC", college: 1, institution: 1 },
          { id: 2, name: "Mathematics", code: "MTH", college: 1, institution: 1 },
        ],
        count: 2,
      });
      return;
    }

    if (path.endsWith("/dashboard/student/")) {
      await json(route, 200, { success: true, data: clone(STUDENT_DASHBOARD) });
      return;
    }

    if (path.endsWith("/dashboard/lecturer/")) {
      await json(route, 200, clone(LECTURER_DASHBOARD));
      return;
    }

    if (path.includes("/analytics/dashboard/lecturer/")) {
      await json(route, 200, clone(LECTURER_DASHBOARD.data.stats));
      return;
    }

    if (path.includes("/analytics/attendance/course/") && method === "GET") {
      const match = path.match(/\/analytics\/attendance\/course\/(\d+)\//);
      const courseId = match ? Number(match[1]) : 1;
      await json(route, 200, buildCourseAnalytics(state, courseId));
      return;
    }

    if (path.includes("/reports/export/attendance/") && method === "GET") {
      state.counters.exports += 1;
      const format = path.split("/").at(-2) || "csv";
      const csv = `matric_number,full_name,status\n${STUDENT_USER.matric_number},${STUDENT_USER.full_name},PRESENT\n`;
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": format === "pdf" ? "application/pdf" : "text/csv",
        },
        body: format === "pdf" ? "%PDF-1.4 present report" : csv,
      });
      return;
    }

    if (path.endsWith("/sessions/") && method === "GET") {
      await json(route, 200, { results: filterSessions(state, url.searchParams), count: filterSessions(state, url.searchParams).length });
      return;
    }

    if (path.endsWith("/sessions/") && method === "POST") {
      const created: PresentlySession = {
        id: state.sessions.length + 10,
        course: Number(body.course || ACTIVE_SESSION.course),
        course_name: COURSE_DATA_STRUCTURES.title,
        course_code: COURSE_DATA_STRUCTURES.code,
        session_code: "NEWA1234",
        start_time: body.start_time || new Date().toISOString(),
        end_time: body.end_time || new Date(Date.now() + 60 * 60_000).toISOString(),
        is_active: true,
        latitude: MAIN_VENUE.latitude,
        longitude: MAIN_VENUE.longitude,
        location_radius: Number(body.location_radius || 100),
        venue: Number(body.venue || MAIN_VENUE.id),
        venue_name: MAIN_VENUE.name,
        venue_code: MAIN_VENUE.code,
        attendee_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.sessions.unshift(created);
      await json(route, 201, created);
      return;
    }

    if (path.match(/^\/api\/sessions\/\d+\/end\/$/) && method === "POST") {
      const id = Number(path.match(/^\/api\/sessions\/(\d+)\/end\/$/)?.[1]);
      const session = state.sessions.find((item) => item.id === id);
      if (session) {
        session.is_active = false;
      }
      await json(route, 200, session || {});
      return;
    }

    if (path.match(/^\/api\/sessions\/\d+\/manual_mark\/$/) && method === "POST") {
      state.counters.manualMarks += 1;
      const id = Number(path.match(/^\/api\/sessions\/(\d+)\/manual_mark\/$/)?.[1]);
      const session = state.sessions.find((item) => item.id === id);
      const attendance = createAttendanceRecord({
        id: state.attendances.length + 20,
        session: id,
        student: body.student_id || body.matric_number || "manual",
        student_name: body.full_name || "Manual Entry",
        student_matric: body.matric_number || body.student_id || "MANUAL/001",
        course_code: session?.course_code || ACTIVE_SESSION.course_code,
      });
      state.attendances.unshift(attendance);
      if (session) {
        session.attendee_count = state.attendances.filter((record) => record.session === session.id).length;
      }
      await json(route, 200, { success: true, attendance });
      return;
    }

    if (path.endsWith("/attendances/") && method === "GET") {
      const records = filterAttendances(state, url.searchParams);
      await json(route, 200, { results: records, count: records.length });
      return;
    }

    if (path.endsWith("/course-enrollments/") && method === "GET") {
      const course = url.searchParams.get("course");
      const student = url.searchParams.get("student");
      const results = state.enrollments.filter((enrollment) => {
        if (course && String(enrollment.course) !== course) return false;
        if (student && enrollment.student !== student) return false;
        return enrollment.is_active;
      });
      await json(route, 200, results);
      return;
    }

    if (path.endsWith("/course-enrollments/enroll/") && method === "POST") {
      state.enrollments.push({
        student: state.currentUser?.id || STUDENT_USER.id,
        course: Number(body.course_id || ACTIVE_SESSION.course),
        is_active: true,
      });
      await json(route, 200, { success: true });
      return;
    }

    const checkInMatch = path.match(/^\/api\/check-in\/([^/]+)\/$/);
    const sessionCheckInMatch = path.match(/^\/api\/sessions\/(\d+)\/check_in\/$/);

    if ((checkInMatch || sessionCheckInMatch) && method === "GET") {
      const session = checkInMatch ? pickSession(state, checkInMatch[1]) : state.sessions.find((item) => item.id === Number(sessionCheckInMatch?.[1]));
      await json(route, session ? 200 : 404, session ? { session } : { error: "Session not found" });
      return;
    }

    if ((checkInMatch || sessionCheckInMatch) && method === "POST") {
      const session = checkInMatch ? pickSession(state, checkInMatch[1]) : state.sessions.find((item) => item.id === Number(sessionCheckInMatch?.[1]));
      if (!session) {
        await json(route, 404, { error: "Session not found" });
        return;
      }

      if (state.checkInDelayMs > 0 || state.forceSlowSubmission) {
        await new Promise((resolve) => setTimeout(resolve, state.checkInDelayMs || 1200));
      }

      const result = buildCheckInResponse(state, session, body);
      await json(route, result.status, result.body);
      return;
    }

    if (path.endsWith("/users/") && method === "GET") {
      await json(route, 200, { results: [state.currentUser || STUDENT_USER], count: 1 });
      return;
    }

    if (path.endsWith("/system/stats/") || path.endsWith("/system/activity/") || path.endsWith("/system/alerts/") || path.endsWith("/system/config/")) {
      await json(route, 200, {});
      return;
    }

    if (path.endsWith("/notifications/") || path.includes("/notifications/")) {
      await json(route, 200, { results: [], count: 0 });
      return;
    }

    await json(route, 200, {});
  });
}
