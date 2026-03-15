// Auth0 Post-Login Action: "Add Custom Claims"
//
// Purpose: Injects the user's email and display name into the access token
// as namespaced custom claims. This allows the backend to read user info
// directly from the JWT without calling the /userinfo endpoint (which is
// unreachable from Docker containers during local development).
//
// Configuration: Auth0 Dashboard > Actions > Flows > Login
//   1. Create a new custom action with this code
//   2. Deploy the action
//   3. Drag it into the Login flow
//
// The backend reads these claims via the constants:
//   CustomEmailClaim = "https://langteach.app/email"
//   CustomNameClaim  = "https://langteach.app/name"
// (see backend/LangTeach.Api/Controllers/AuthController.cs)

exports.onExecutePostLogin = async (event, api) => {
  const namespace = "https://langteach.app";

  if (event.user.email) {
    api.accessToken.setCustomClaim(`${namespace}/email`, event.user.email);
  }

  if (event.user.name) {
    api.accessToken.setCustomClaim(`${namespace}/name`, event.user.name);
  }
};
