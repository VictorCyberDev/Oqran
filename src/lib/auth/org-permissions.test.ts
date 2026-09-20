import { describe, expect, it } from "vitest";
import { canManageOrg, type OrgActor } from "./org-permissions";

const businessLead: OrgActor = {
  role: "BUSINESS",
  status: "ACTIVE",
  orgRole: "LEAD",
  organizationId: "org_1",
};

describe("canManageOrg", () => {
  it("allows a business lead", () => {
    expect(canManageOrg(businessLead, ["BUSINESS"])).toBe(true);
  });

  it("denies a business member — team management is lead-only", () => {
    expect(canManageOrg({ ...businessLead, orgRole: "MEMBER" }, ["BUSINESS"])).toBe(false);
  });

  it("denies a bank member and a government member too", () => {
    expect(
      canManageOrg({ ...businessLead, role: "BANK", orgRole: "MEMBER" }, ["BANK"])
    ).toBe(false);
    expect(
      canManageOrg({ ...businessLead, role: "GOVERNMENT", orgRole: "MEMBER" }, ["GOVERNMENT"])
    ).toBe(false);
  });

  it("denies a lead of the wrong top-level role", () => {
    expect(canManageOrg(businessLead, ["BANK"])).toBe(false);
  });

  it("denies a lead with no organization", () => {
    expect(canManageOrg({ ...businessLead, organizationId: null }, ["BUSINESS"])).toBe(false);
  });

  it("denies a suspended lead", () => {
    expect(canManageOrg({ ...businessLead, status: "SUSPENDED" }, ["BUSINESS"])).toBe(false);
    expect(
      canManageOrg({ ...businessLead, status: "PENDING_APPROVAL" }, ["BUSINESS"])
    ).toBe(false);
  });

  it("denies a missing user", () => {
    expect(canManageOrg(null, ["BUSINESS"])).toBe(false);
    expect(canManageOrg(undefined, ["BUSINESS"])).toBe(false);
  });

  it("allows a lead when several roles are permitted", () => {
    expect(canManageOrg(businessLead, ["BANK", "GOVERNMENT", "BUSINESS"])).toBe(true);
  });
});
