import { StrategyVerifyCallback } from "remix-auth";
import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyParams,
} from "remix-auth-oauth2";

export type WhoopScope =
  | "read:recovery"
  | "read:cycles"
  | "read:workout"
  | "read:sleep"
  | "read:profile"
  | "read:body_measurement"
  | "offline";

export interface WhoopStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: WhoopScope[] | string;
}

export interface WhoopProfile extends OAuth2Profile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface WhoopExtraParams extends Record<string, string | number> {
  expires_in: 3600;
  token_type: "bearer";
  scope: string;
}

export const WhoopStrategyDefaultScopes: WhoopScope[] = [
  "read:profile",
  "offline",
];

export const WhoopStrategyDefaultName = "whoop";
export const WhoopStrategyScopeSeperator = " ";

export class WhoopStrategy<User> extends OAuth2Strategy<
  User,
  WhoopProfile,
  WhoopExtraParams
> {
  name = WhoopStrategyDefaultName;
  userInfoURL = "https://api.prod.whoop.com/developer/v1/user/profile/basic";

  private readonly scope: WhoopScope[];

  // We receive our custom options and our verify callback
  constructor(
    options: WhoopStrategyOptions,
    // Here we type the verify callback as a StrategyVerifyCallback receiving
    // the User type and the OAuth2StrategyVerifyParams with the Auth0Profile
    // and the Auth0ExtraParams
    // This way, when using the strategy the verify function will receive as
    // params an object with accessToken, refreshToken, extraParams and profile.
    // The latest two matching the types of Auth0Profile and Auth0ExtraParams.
    verify: StrategyVerifyCallback<
      User,
      OAuth2StrategyVerifyParams<WhoopProfile, WhoopExtraParams>
    >,
  ) {
    // And we pass the options to the super constructor using our own options
    // to generate them, this was we can ask less configuration to the developer
    // using our strategy
    super(
      {
        authorizationURL: "https://api.prod.whoop.com/oauth/oauth2/auth",
        tokenURL: "https://api.prod.whoop.com/oauth/oauth2/token",
        clientID: options.clientID,
        clientSecret: options.clientSecret,
        callbackURL: options.callbackURL,
      },
      verify,
    );

    this.scope = this.getScope(options.scope);
  }

  protected authorizationParams() {
    const urlSearchParams: Record<string, string> = {
      scope: this.scope.join(WhoopStrategyScopeSeperator),
    };

    return new URLSearchParams(urlSearchParams);
  }

  protected async userProfile(accessToken: string): Promise<WhoopProfile> {
    let response = await fetch(this.userInfoURL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let data: WhoopProfile = await response.json();

    return data;
  }

  // Allow users the option to pass a scope string, or typed array
  private getScope(scope: WhoopStrategyOptions["scope"]) {
    if (!scope) {
      return WhoopStrategyDefaultScopes;
    } else if (typeof scope === "string") {
      return scope.split(WhoopStrategyScopeSeperator) as WhoopScope[];
    }

    return scope;
  }
}
