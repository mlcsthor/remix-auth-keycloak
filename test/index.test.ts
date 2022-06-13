import { createCookieSessionStorage } from "@remix-run/node";
import { KeycloakStrategy } from "../src";

describe(KeycloakStrategy, () => {
  let verify = jest.fn();
  // You will probably need a sessionStorage to test the strategy.
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  let options = Object.freeze({
    domain: "example.app",
    realm: "example",
    clientID: "MY_CLIENT_ID",
    clientSecret: "MY_CLIENT_SECRET",
    callbackURL: "https://example.app/callback",
  });

  interface User {
    id: number;
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should have the scope 'openid profile email' as default", async () => {
    let strategy = new KeycloakStrategy(options, verify);

    let request = new Request("https://example.app/auth/keycloak");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("scope")).toBe(
        "openid profile email"
      );
    }
  });

  test("should allow changing the scope", async () => {
    let strategy = new KeycloakStrategy(
      {
        ...options,
        scope: "custom",
      },
      verify
    );

    let request = new Request("https://example.app/auth/keycloak");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("scope")).toBe("custom");
    }
  });

  test("should correctly format the authorization URL", async () => {
    let strategy = new KeycloakStrategy(options, verify);

    let request = new Request("https://example.app/auth/keycloak");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.hostname).toBe("example.app");
      expect(redirectUrl.pathname).toBe(
        "/auth/realms/example/protocol/openid-connect/auth"
      );
    }
  });

  test("should redirect to '/' if user is already in the session", async () => {
    let strategy = new KeycloakStrategy<User>(options, verify);

    let session = await sessionStorage.getSession();
    session.set("user", { id: 123 });

    let request = new Request("https://example.app/auth/keycloak", {
      headers: { cookie: await sessionStorage.commitSession(session) },
    });

    let user = await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });

    expect(user).toEqual({ id: 123 });
  });
});
