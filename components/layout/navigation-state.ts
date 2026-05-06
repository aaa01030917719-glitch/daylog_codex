export function isNavigationItemActive(
  pathname: string,
  href: string,
  source: string | null = null
) {
  const [basePath] = href.split("?");

  if (basePath === "/") {
    return pathname === "/";
  }

  const isMeetingNoteFromNotices =
    pathname.startsWith("/docs/") &&
    (source === "notices" || source === "meeting-note");

  if (basePath === "/notices") {
    return pathname.startsWith("/notices") || isMeetingNoteFromNotices;
  }

  if (basePath === "/docs") {
    return pathname === "/docs" || (pathname.startsWith("/docs/") && !isMeetingNoteFromNotices);
  }

  return pathname.startsWith(basePath);
}
