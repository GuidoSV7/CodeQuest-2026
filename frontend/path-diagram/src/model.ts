export type DiagramBucket = "required" | "recommended" | "optional" | "anytime";

export type DiagramCategory = "free" | "mini" | "exclusive" | "legacy" | "wip" | null;

export type CourseCard = {
  description: string | null;
  instructor: string | null;
  lessonCount: number | null;
  videoHours: number | null;
  previewYoutubeId: string | null;
  prerequisites: string[];
  tags: string[];
  sections: Array<{ title: string; lessons: string[] }>;
  url: string;
  price?: { amount: number; currency: "USD" } | null;
  related?: Array<{ title: string; url: string }>;
};

export type DiagramItem = {
  courseId: string;
  title: string;
  url: string;
  bucket: DiagramBucket | null;
  position: number;
  alreadyKnown: boolean;
  partial: boolean;
  completed: boolean;
  category: DiagramCategory;
  lessonCount: number | null;
  videoHours: number | null;
  detail?: CourseCard | null;
};

export type DiagramModel = {
  title: string;
  pathId: string | null;
  items: DiagramItem[];
  edges: Array<{ fromCourseId: string; toCourseId: string }>;
  allowProgress: boolean;
};

const BUCKET_LABEL: Record<DiagramBucket, string> = {
  required: "Requerido",
  recommended: "Recomendado",
  optional: "Opcional",
  anytime: "En cualquier momento",
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,}$/;

export function introVideoSrc(id: string | null | undefined): string | null {
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function bucketLabel(bucket: DiagramBucket | null): string {
  if (!bucket) return "";
  return BUCKET_LABEL[bucket];
}

export function iconLabel(category: DiagramCategory): string {
  if (category === "free") return "Gratis";
  if (category === "mini") return "Minicurso";
  if (category === "exclusive") return "Exclusivo";
  if (category === "legacy") return "Legacy";
  if (category === "wip") return "En construcción";
  return "Curso";
}

type OfficialCourse = {
  course_id: string;
  title: string;
  url: string;
  bucket: DiagramBucket | null;
  position: number;
  partial?: boolean;
  already_known?: boolean;
  category?: DiagramCategory;
  lesson_count?: number | null;
  video_hours?: number | null;
};

export function modelFromToolResult(payload: {
  title?: string;
  path?: { id?: string; title?: string; courses?: OfficialCourse[]; edges?: Array<{ from_course_id: string; to_course_id: string }> };
  items?: OfficialCourse[];
  edges?: Array<{ from_course_id: string; to_course_id: string }>;
  ui?: { allow_progress?: boolean };
  id?: string;
  userItems?: Array<{
    courseId: string;
    courseTitle: string;
    bucket: DiagramBucket | null;
    position: number;
    progress?: { status?: string };
    detail?: CourseCard | null;
  }>;
}): DiagramModel {
  const courses = payload.path?.courses ?? payload.items ?? [];
  const items = courses.map((course) => ({
    courseId: course.course_id,
    title: course.title,
    url: course.url,
    bucket: course.bucket,
    position: course.position,
    alreadyKnown: course.already_known === true,
    partial: course.partial === true,
    completed: false,
    category: course.category ?? null,
    lessonCount: course.lesson_count ?? null,
    videoHours: course.video_hours ?? null,
    detail: null,
  }));
  const userItems = (payload.userItems ?? []).map((item) => ({
    courseId: item.courseId,
    title: item.courseTitle,
    url: item.detail?.url ?? "",
    bucket: item.bucket,
    position: item.position,
    alreadyKnown: false,
    partial: false,
    completed: item.progress?.status === "completed",
    category: null,
    lessonCount: item.detail?.lessonCount ?? null,
    videoHours: item.detail?.videoHours ?? null,
    detail: item.detail ?? null,
  }));
  return {
    title: payload.path?.title ?? payload.title ?? "Ruta",
    pathId: payload.path?.id ?? payload.id ?? null,
    items: items.length > 0 ? items : userItems,
    edges: (payload.edges ?? payload.path?.edges ?? []).map((edge) => ({
      fromCourseId: edge.from_course_id,
      toCourseId: edge.to_course_id,
    })),
    allowProgress: payload.ui?.allow_progress === true,
  };
}

type UserPathItem = {
  courseId: string;
  courseTitle: string;
  bucket: DiagramBucket | null;
  position: number;
  progress?: { status?: string };
  detail?: CourseCard | null;
};

function byItemPosition(left: UserPathItem, right: UserPathItem): number {
  return left.position - right.position || left.courseId.localeCompare(right.courseId);
}

function chainEdges(items: UserPathItem[]) {
  return items.slice(0, -1).map((item, index) => ({
    from_course_id: item.courseId,
    to_course_id: items[index + 1]?.courseId ?? "",
  })).filter((edge) => edge.to_course_id);
}

function defaultPathEdges(items: UserPathItem[]) {
  const required = items.filter((item) => item.bucket === "required").sort(byItemPosition);
  if (required.length >= 2) return chainEdges(required);
  const ordered = items.filter((item) => item.bucket !== "anytime").sort(byItemPosition);
  const start = ordered[0];
  if (!start) return [];
  return ordered.slice(1).map((item) => ({
    from_course_id: start.courseId,
    to_course_id: item.courseId,
  }));
}

export function modelFromUserPath(detail: {
  id: string;
  title: string;
  items: UserPathItem[];
  edges?: Array<{ from_course_id: string; to_course_id: string }>;
}): DiagramModel {
  const edges = detail.edges ?? defaultPathEdges(detail.items);
  return modelFromToolResult({
    title: detail.title,
    id: detail.id,
    edges,
    ui: { allow_progress: true },
    userItems: detail.items,
  });
}
