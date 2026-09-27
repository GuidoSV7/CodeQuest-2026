export type DiagramBucket = "required" | "recommended" | "optional" | "anytime";

export type DiagramCategory = "free" | "mini" | "exclusive" | "legacy" | "wip" | null;

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
  }));
  const userItems = (payload.userItems ?? []).map((item) => ({
    courseId: item.courseId,
    title: item.courseTitle,
    url: "",
    bucket: item.bucket,
    position: item.position,
    alreadyKnown: false,
    partial: false,
    completed: item.progress?.status === "completed",
    category: null,
    lessonCount: null,
    videoHours: null,
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

export function modelFromUserPath(detail: {
  id: string;
  title: string;
  items: Array<{
    courseId: string;
    courseTitle: string;
    bucket: DiagramBucket | null;
    position: number;
    progress?: { status?: string };
  }>;
  edges?: Array<{ from_course_id: string; to_course_id: string }>;
}): DiagramModel {
  const required = detail.items
    .filter((item) => item.bucket === "required")
    .sort((left, right) => left.position - right.position || left.courseId.localeCompare(right.courseId));
  const edges = detail.edges ?? required.slice(0, -1).map((item, index) => ({
    from_course_id: item.courseId,
    to_course_id: required[index + 1]?.courseId ?? "",
  })).filter((edge) => edge.to_course_id);
  return modelFromToolResult({
    title: detail.title,
    id: detail.id,
    edges,
    ui: { allow_progress: true },
    userItems: detail.items,
  });
}
