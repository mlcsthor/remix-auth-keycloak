# KeycloakStrategy

The Keycloak strategy is used to authenticate users against an Keycloak account. It extends the OAuth2Strategy.

## Supported runtimes

| Runtime    | Has Support |
| ---------- | ----------- |
| Node.js    | ✅          |
| Cloudflare | ✅          |

## Usage

### Create the strategy instance

```tsx
// app/utils/auth.server.ts
import { Authenticator } from "remix-auth";
import { Keycloak } from "remix-auth-keycloak";

// Create an instance of the authenticator, pass a generic with what your
// strategies will return and will be stored in the session
export const authenticator = new Authenticator<User>(sessionStorage);

let keycloakStrategy = new KeycloakStrategy(
  {
    useSSL: true,
    domain: "example.app",
    realm: "example",
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "your.app/callback",
  },
  async ({ accessToken, refreshToken, extraParams, profile }) => {
    // Get the user data from your DB or API using the tokens and profile
    return User.findOrCreate({ email: profile.emails[0].value });
  }
);

authenticator.use(keycloakStrategy);
```

### Setup your routes

```tsx
// app/routes/login.tsx
export default function Login() {
  return (
    <Form action="/auth/keycloak" method="post">
      <button>Login with Keycloak</button>
    </Form>
  );
}
```

```tsx
// app/routes/auth/keycloak.tsx
import type { ActionFunction, LoaderFunction } from "remix";

import { authenticator } from "~/utils/auth.server";

export let loader: LoaderFunction = () => redirect("/login");

export let action: ActionFunction = ({ request }) => {
  return authenticator.authenticate("keycloak", request);
};
```

```tsx
// app/routes/auth/keycloak/callback.tsx
import type { ActionFunction, LoaderFunction } from "remix";

import { authenticator } from "~/utils/auth.server";

export let loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("keycloak", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```
