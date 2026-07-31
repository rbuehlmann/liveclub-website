export { onGameEventCreate } from "./triggers/onGameEventCreate";
export { onTeamWrite } from "./triggers/onTeamWrite";
export { onInvitationCreate } from "./triggers/onInvitationCreate";

export { createClub } from "./callable/createClub";
export { createTeam } from "./callable/createTeam";
export { acceptInvitation } from "./callable/acceptInvitation";
export { syncClubClaims } from "./callable/syncClubClaims";
export { adminSetLicense } from "./callable/adminSetLicense";
export { adminListClubs } from "./callable/adminListClubs";
export { devGrantPlatformAdmin } from "./callable/devGrantPlatformAdmin";
export { grantPlatformAdmin } from "./callable/grantPlatformAdmin";
export { sendTestEmail } from "./callable/sendTestEmail";
export { createCheckoutSession } from "./callable/createCheckoutSession";
export { createBillingPortalSession } from "./callable/createBillingPortalSession";
export { onStripeWebhook } from "./https/onStripeWebhook";
