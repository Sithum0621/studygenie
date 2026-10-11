import type { Workspace } from "./workspace-context";

const PREFIX = "studygenie.guideSeen.";

export function hasSeenGuide(workspace: Workspace) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PREFIX + workspace) === "1";
}

export function markGuideSeen(workspace: Workspace) {
  window.localStorage.setItem(PREFIX + workspace, "1");
}
