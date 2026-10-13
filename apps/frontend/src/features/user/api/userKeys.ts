export const userKeys = {
  all: ["user"] as const,
  settings: () => [...userKeys.all, "settings"] as const,
}
