export type PresentlyRole = "STUDENT" | "LECTURER" | "ADMIN" | "CLASS_REP";

export interface PresentlyUser {
  id: string;
  email: string;
  full_name: string;
  role: PresentlyRole;
  onboarding_complete: boolean;
  email_verified?: boolean;
  permissions?: string[];
  institution?: number;
  college?: number;
  department?: string;
  matric_number?: string;
}

export interface PresentlyCourse {
  id: number;
  department: number[];
  department_name?: string;
  code: string;
  title: string;
  lecturer?: string;
  lecturer_name?: string;
  credit_units: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PresentlyVenue {
  id: number;
  institution: number;
  name: string;
  code: string;
  capacity: number;
  latitude: number;
  longitude: number;
  verification_radius: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PresentlySession {
  id: number;
  course: number;
  course_name: string;
  course_code: string;
  session_code: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  latitude: number;
  longitude: number;
  location_radius: number;
  venue: number;
  venue_name: string;
  venue_code: string;
  attendee_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PresentlyAttendance {
  id: number;
  session: number;
  student: string;
  student_name: string;
  student_matric: string;
  student_department: string;
  course_code: string;
  checked_in_at: string;
  latitude: number;
  longitude: number;
  location_verified: boolean;
  status: "PRESENT" | "LATE" | "EXCUSED" | "ABSENT";
  distance_from_venue: number;
}

export interface CourseAnalyticsStudent {
  id: string;
  matric_number: string;
  full_name: string;
  total_sessions: number;
  sessions_attended: number;
  attendance_rate: number;
  status: "Present" | "Absent";
  name: string;
  matric: string;
  department: string;
  level: string;
  attended: number;
  total: number;
  percentage: number;
}

export interface CourseAnalytics {
  course_id: number;
  course_code: string;
  course_name: string;
  lecturer?: string;
  total_sessions: number;
  students: CourseAnalyticsStudent[];
  avg_attendance: number;
  at_risk_count: number;
  good_standing_count: number;
  benchmark: number;
  date_from?: string | null;
  date_to?: string | null;
}

const iso = (date: Date) => date.toISOString();
const minutesFromNow = (minutes: number) => iso(new Date(Date.now() + minutes * 60_000));
const minutesAgo = (minutes: number) => iso(new Date(Date.now() - minutes * 60_000));

export const STUDENT_USER: PresentlyUser = {
  id: "student-uuid-001",
  email: "student@presently.test",
  full_name: "Alice Student",
  role: "STUDENT",
  onboarding_complete: true,
  email_verified: true,
  matric_number: "MAT/2021/001",
  department: "Computer Science",
  institution: 1,
  college: 1,
};

export const STUDENT_USER_2: PresentlyUser = {
  id: "student-uuid-002",
  email: "student2@presently.test",
  full_name: "Ben Student",
  role: "STUDENT",
  onboarding_complete: true,
  email_verified: true,
  matric_number: "MAT/2021/002",
  department: "Computer Science",
  institution: 1,
  college: 1,
};

export const LECTURER_USER: PresentlyUser = {
  id: "lecturer-uuid-002",
  email: "lecturer@presently.test",
  full_name: "Dr. Bob Lecturer",
  role: "LECTURER",
  onboarding_complete: true,
  email_verified: true,
  permissions: ["reports.view", "sessions.manage"],
  institution: 1,
  college: 1,
};

export const ADMIN_USER: PresentlyUser = {
  id: "admin-uuid-003",
  email: "admin@presently.test",
  full_name: "Carol Admin",
  role: "ADMIN",
  onboarding_complete: true,
  email_verified: true,
  permissions: ["system.users.manage", "system.settings.manage", "system.analytics.view", "venues.view"],
  institution: 1,
  college: 1,
};

export const CLASS_REP_USER: PresentlyUser = {
  id: "rep-uuid-004",
  email: "rep@presently.test",
  full_name: "Rita Rep",
  role: "CLASS_REP",
  onboarding_complete: true,
  email_verified: true,
  institution: 1,
  college: 1,
  department: "Computer Science",
};

export const COURSE_DATA_STRUCTURES: PresentlyCourse = {
  id: 1,
  department: [1],
  department_name: "Computer Science",
  code: "CS301",
  title: "Data Structures",
  lecturer: "lecturer-uuid-002",
  lecturer_name: "Dr. Bob Lecturer",
  credit_units: 3,
  is_active: true,
  created_at: minutesAgo(120),
  updated_at: minutesAgo(10),
};

export const COURSE_DATABASE_SYSTEMS: PresentlyCourse = {
  id: 2,
  department: [1],
  department_name: "Computer Science",
  code: "CS401",
  title: "Database Systems",
  lecturer: "lecturer-uuid-002",
  lecturer_name: "Dr. Bob Lecturer",
  credit_units: 3,
  is_active: true,
  created_at: minutesAgo(120),
  updated_at: minutesAgo(10),
};

export const MAIN_VENUE: PresentlyVenue = {
  id: 1,
  institution: 1,
  name: "Main Hall",
  code: "MH-01",
  capacity: 120,
  latitude: 7.5197,
  longitude: 4.5267,
  verification_radius: 100,
  is_active: true,
  created_at: minutesAgo(120),
  updated_at: minutesAgo(5),
};

export const SECOND_VENUE: PresentlyVenue = {
  id: 2,
  institution: 1,
  name: "North Lecture Theatre",
  code: "NLT-02",
  capacity: 200,
  latitude: 7.5001,
  longitude: 4.5001,
  verification_radius: 80,
  is_active: true,
  created_at: minutesAgo(120),
  updated_at: minutesAgo(5),
};

export const ACTIVE_SESSION: PresentlySession = {
  id: 1,
  course: 1,
  course_name: "Data Structures",
  course_code: "CS301",
  session_code: "ABCD1234",
  start_time: minutesAgo(5),
  end_time: minutesFromNow(55),
  is_active: true,
  latitude: 7.5197,
  longitude: 4.5267,
  location_radius: 100,
  venue: 1,
  venue_name: "Main Hall",
  venue_code: "MH-01",
  attendee_count: 1,
  created_at: minutesAgo(5),
  updated_at: minutesAgo(1),
};

export const SOON_TO_EXPIRE_SESSION: PresentlySession = {
  ...ACTIVE_SESSION,
  id: 2,
  session_code: "BOUND123",
  start_time: minutesAgo(1),
  end_time: minutesFromNow(0.02),
  attendee_count: 0,
};

export const EXPIRED_SESSION: PresentlySession = {
  ...ACTIVE_SESSION,
  id: 3,
  session_code: "WXYZ9876",
  start_time: minutesAgo(120),
  end_time: minutesAgo(5),
  is_active: false,
  attendee_count: 0,
};

export const ACTIVE_ATTENDANCE: PresentlyAttendance = {
  id: 1,
  session: 1,
  student: STUDENT_USER.id,
  student_name: STUDENT_USER.full_name,
  student_matric: STUDENT_USER.matric_number!,
  student_department: STUDENT_USER.department || "Computer Science",
  course_code: "CS301",
  checked_in_at: minutesAgo(1),
  latitude: 7.5197,
  longitude: 4.5267,
  location_verified: true,
  status: "PRESENT",
  distance_from_venue: 18,
};

export const STUDENT_DASHBOARD = {
  user: {
    id: STUDENT_USER.id,
    full_name: STUDENT_USER.full_name,
    email: STUDENT_USER.email,
    matric_number: STUDENT_USER.matric_number,
    level: "300",
    department: STUDENT_USER.department,
  },
  enrolled_courses: [
    {
      id: 1,
      course: 1,
      course_code: "CS301",
      course_name: "Data Structures",
      course_title: "Data Structures",
      department: 1,
      credit_units: 3,
      lecturer_name: "Dr. Bob Lecturer",
      is_active: true,
      enrolled_at: minutesAgo(500),
      attendance_percentage: 85,
      sessions_attended: 17,
      total_sessions: 20,
      status: "Good",
    },
  ],
  attendance_stats: {
    average_attendance: 85,
    total_present: 17,
    total_late: 2,
    total_absent: 3,
    total_sessions: 20,
  },
  next_class: {
    id: 1,
    course_code: "CS301",
    course_name: "Data Structures",
    start_time: minutesFromNow(60),
    venue_name: "Main Hall",
    venue_code: "MH-01",
  },
  recent_activity: [
    {
      id: 1,
      type: "attendance",
      course_code: "CS301",
      course_name: "Data Structures",
      timestamp: minutesAgo(2),
      status: "PRESENT",
      description: "Marked present for Data Structures",
    },
  ],
};

export const LECTURER_DASHBOARD = {
  data: {
    stats: {
      total_courses: 2,
      total_students: 48,
      active_sessions: 1,
      todays_sessions: 1,
    },
    active_sessions: [ACTIVE_SESSION],
    recent_sessions: [ACTIVE_SESSION],
  },
};

export const COURSE_ANALYTICS: Record<number, CourseAnalytics> = {
  1: {
    course_id: 1,
    course_code: "CS301",
    course_name: "Data Structures",
    lecturer: "Dr. Bob Lecturer",
    total_sessions: 20,
    students: [
      {
        id: STUDENT_USER.id,
        matric_number: STUDENT_USER.matric_number!,
        full_name: STUDENT_USER.full_name,
        total_sessions: 20,
        sessions_attended: 17,
        attendance_rate: 85,
        status: "Present",
        name: STUDENT_USER.full_name,
        matric: STUDENT_USER.matric_number!,
        department: STUDENT_USER.department || "Computer Science",
        level: "300",
        attended: 17,
        total: 20,
        percentage: 85,
      },
      {
        id: STUDENT_USER_2.id,
        matric_number: STUDENT_USER_2.matric_number!,
        full_name: STUDENT_USER_2.full_name,
        total_sessions: 20,
        sessions_attended: 12,
        attendance_rate: 60,
        status: "Absent",
        name: STUDENT_USER_2.full_name,
        matric: STUDENT_USER_2.matric_number!,
        department: STUDENT_USER_2.department || "Computer Science",
        level: "300",
        attended: 12,
        total: 20,
        percentage: 60,
      },
    ],
    avg_attendance: 72,
    at_risk_count: 1,
    good_standing_count: 1,
    benchmark: 75,
  },
};

export const createAttendanceRecord = (overrides: Partial<PresentlyAttendance> = {}): PresentlyAttendance => ({
  id: 99,
  session: ACTIVE_SESSION.id,
  student: STUDENT_USER.id,
  student_name: STUDENT_USER.full_name,
  student_matric: STUDENT_USER.matric_number!,
  student_department: STUDENT_USER.department || "Computer Science",
  course_code: ACTIVE_SESSION.course_code,
  checked_in_at: new Date().toISOString(),
  latitude: ACTIVE_SESSION.latitude,
  longitude: ACTIVE_SESSION.longitude,
  location_verified: true,
  status: "PRESENT",
  distance_from_venue: 18,
  ...overrides,
});

export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
