import type { Role } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<Role, string> = {
  CITIZEN: "Citizen",
  BUSINESS: "Business",
  BANK: "Bank Compliance",
  GOVERNMENT: "Government Investigator",
  DEVELOPER: "Developer",
  ADMIN: "Admin",
  PLATFORM_OWNER: "Platform Owner",
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
    case "PLATFORM_OWNER":
      return "/owner";
    default:
      return "/";
  }
}
