import { localStore } from "./local-store";
import type { ClassAssignment, ClassRoom, ClassStudent } from "./types";

export function loadClasses() {
  return localStore.getClasses();
}

export function upsertClass(item: ClassRoom) {
  const all = loadClasses();
  const next = all.some((row) => row.id === item.id)
    ? all.map((row) => (row.id === item.id ? item : row))
    : [item, ...all];
  localStore.saveClasses(next);
  return next;
}

export function deleteClass(id: string) {
  localStore.saveClasses(loadClasses().filter((row) => row.id !== id));
  localStore.saveClassStudents(
    localStore.getClassStudents().filter((row) => row.classId !== id),
  );
  localStore.saveClassAssignments(
    localStore.getClassAssignments().filter((row) => row.classId !== id),
  );
}

export function loadStudents(classId?: string) {
  const items = localStore.getClassStudents();
  return classId ? items.filter((row) => row.classId === classId) : items;
}

export function upsertStudent(item: ClassStudent) {
  const all = localStore.getClassStudents();
  const next = all.some((row) => row.id === item.id)
    ? all.map((row) => (row.id === item.id ? item : row))
    : [item, ...all];
  localStore.saveClassStudents(next);
  return next;
}

export function deleteStudent(id: string) {
  localStore.saveClassStudents(
    localStore.getClassStudents().filter((row) => row.id !== id),
  );
}

export function loadAssignments(classId?: string) {
  const items = localStore.getClassAssignments();
  return classId ? items.filter((row) => row.classId === classId) : items;
}

export function upsertAssignment(item: ClassAssignment) {
  const all = localStore.getClassAssignments();
  const next = all.some((row) => row.id === item.id)
    ? all.map((row) => (row.id === item.id ? item : row))
    : [item, ...all];
  localStore.saveClassAssignments(next);
  return next;
}

export function deleteAssignment(id: string) {
  localStore.saveClassAssignments(
    localStore.getClassAssignments().filter((row) => row.id !== id),
  );
}

export function toggleAssignment(id: string) {
  const next = localStore.getClassAssignments().map((row) =>
    row.id === id ? { ...row, done: !row.done } : row,
  );
  localStore.saveClassAssignments(next);
  return next;
}

export function classNameOf(id: string) {
  return loadClasses().find((row) => row.id === id)?.name || "";
}
