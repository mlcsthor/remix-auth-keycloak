import type { StrategyVerifyCallback } from "remix-auth";
import type {
  OAuth2Profile,
  OAuth2StrategyVerifyParams,
} from "remix-auth-oauth2";
import { OAuth2Strategy } from "remix-auth-oauth2";

export interface KeycloakStrategyOptions {
  useSSL: boolean;
  domain: string;
  realm: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string;
}

export interface KeycloakExtraParams extends Record<string, string | number> {
  id_token: string;
  scope: string;
  expires_in: 86_400;
  token_type: "Bearer";
}

export interface KeycloakProfile extends OAuth2Profile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: [{ value: string }];
  _json: {
    sub: string;
    email: string;
    email_verified: boolean;
    preferred_username: string;
    name: string;
    given_name: string;
    family_name: string;
  };
}

export class KeycloakStrategy<User> extends OAuth2Strategy<
  User,
  KeycloakProfile,
  KeycloakExtraParams
> {
  // The OAuth2Strategy already has a name but we override it to be specific of
  // the service we are using
  name = "keycloak";

  private userInfoURL: string;
  private scope: string;

  // We receive our custom options and our verify callback
  constructor(
    options: KeycloakStrategyOptions,
    // Here we type the verify callback as a StrategyVerifyCallback receiving
    // the User type and the OAuth2StrategyVerifyParams with the Auth0Profile
    // and the Auth0ExtraParams
    // This way, when using the strategy the verify function will receive as
    // params an object with accessToken, refreshToken, extraParams and profile.
    // The latest two matching the types of Auth0Profile and Auth0ExtraParams.
    verify: StrategyVerifyCallback<
      User,
      OAuth2StrategyVerifyParams<KeycloakProfile, KeycloakExtraParams>
    >
  ) {
    // And we pass the options to the super constructor using our own options
    // to generate them, this was we can ask less configuration to the developer
    // using our strategy
    const host = `${options.useSSL ? "https" : "http"}://${options.domain}`;

    super(
      {
        authorizationURL: `${host}/realms/${options.realm}/protocol/openid-connect/auth`,
        tokenURL: `${host}/realms/${options.realm}/protocol/openid-connect/token`,
        clientID: options.clientID,
        clientSecret: options.clientSecret,
        callbackURL: options.callbackURL,
      },
      verify
    );

    this.userInfoURL = `${host}/realms/${options.realm}/protocol/openid-connect/userinfo`;
    this.scope = options.scope || "openid profile email";
  }

  // We override the protected authorizationParams method to return a new
  // URLSearchParams with custom params we want to send to the authorizationURL.
  // Here we add the scope so Auth0 can use it, you can pass any extra param
  // you need to send to the authorizationURL here base on your provider.
  protected authorizationParams() {
    const urlSearchParams: Record<string, string> = {
      scope: this.scope,
    };

    return new URLSearchParams(urlSearchParams);
  }

  // We also override how to use the accessToken to get the profile of the user.
  // Here we fetch a Auth0 specific URL, get the profile data, and build the
  // object based on the Auth0Profile interface.
  protected async userProfile(accessToken: string): Promise<KeycloakProfile> {
    let response = await fetch(this.userInfoURL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let data: KeycloakProfile["_json"] = await response.json();

    let profile: KeycloakProfile = {
      provider: "keycloak",
      displayName: data.name,
      id: data.sub,
      name: {
        familyName: data.family_name,
        givenName: data.given_name,
      },
      emails: [{ value: data.email }],
      _json: data,
    };

    return profile;
  }
}
