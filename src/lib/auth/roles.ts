import type { Role } from "@/generated/prisma/enums";

export function roleHomePath(role: Role): string {
  switch (role) {
    case "CITIZEN":
      return "/citizen";
    case "BUSINESS":
      return "/business";
    case "BANK":
      return "/bank";
    case "GOVERNMENT":
      return "/gov";
    case "DEVELOPER":
      return "/developer";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}
