/** Zod errors -> [{ path: "name.ar", code: "required" }] for the pages to mark the fields */
export const issues = (e: { issues: { path: PropertyKey[]; message: string }[] }) => e.issues.map((i) => ({ path: i.path.join("."), code: i.message }));
