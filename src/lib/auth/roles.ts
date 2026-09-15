import type { Role } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<Role, string> = {
  CITIZEN: "Citizen",
  BUSINESS: "Business",
  BANK: "Bank Compliance",
  GOVERNMENT: "Government Investigator",
  DEVELOPER: "Developer",
  ADMIN: "Admin",
};

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
