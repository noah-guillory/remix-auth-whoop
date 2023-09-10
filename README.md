# Remix Auth - Whoop Stategy

The Whoop Strategy is used to authenticate users through [Whoop's OAuth flow](https://developer.whoop.com/docs/developing/oauth) using [Remix-Auth](https://github.com/sergiodxa/remix-auth), built on top of the [OAuth2Strategy](https://github.com/sergiodxa/remix-auth-oauth2).

## Supported runtimes

| Runtime    | Has Support |
| ---------- | ----------- |
| Node.js    | ✅          |
| Cloudflare | Untested    |

<!-- If it doesn't support one runtime, explain here why -->

## How to use
### Create Whoop Developer account and App

Follow the directions in the [Whoop Developer Documentation](https://developer.whoop.com/docs/developing/getting-started) to set up a developer account and `App`. Here, you define the OAuth scopes that you will be accessing and configurting the redirect URIs.

### Install Dependencies
```sh
npm install remix-auth-whoop remix-auth remix-auth-oauth2
```

### Create the Stategy Instance
```ts
// app/services/auth.server.ts
import { WhoopStrategy } from "remix-auth-whoop";
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/services/session.server";

/**
 * Note: The `User` type is a type that you have defined somewhere in your application
 */
export let authenticator = new Authenticator<User>(sessionStorage);

let whoopStrategy = new WhoopStrategy(
  {
   clientID: "CLIENT_ID",
   clientSecret: "CLIENT_SECRET",
   callbackURL: "https://example.com/auth/whoop/callback", // This URL must be configured as a callback URI in the Whoop Developer dashboard
   scope: ["read:profile", "read:cycles", "offline"] // Optional
  },
  async ({ accessToken, refreshToken, extraParams: { expires_in }, profile }) => {
   const {first_name, last_name, user_id} = profile

    const createUserParams = {
        accessToken,
        expiresAt: Date.now() + expires_in * 1000,
        firstName: first_name,
        lastName: last_name,
        refreshToken,
        userId: user_id,
    }

    const user = await prisma.user.upsert({
        where: {userId: user_id},
        create: createUserParams,
        update: createUserParams,
    })
  }
);

authenticator.use(whoopStrategy);
```

Note: See [Whoop API Documentation](https://developer.whoop.com/api#section/Authentication/OAuth) on possible scopes

### Setup your routes

```tsx
// app/routes/login.tsx
export default function Login() {
  return (
    <form action="/auth/whoop" method="post">
      <button>Login with Whoop</button>
    </form>
  );
}
```

```tsx
// app/routes/auth/whoop.tsx
import type { ActionArgs } from "@remix-run/node";
import { authenticator } from "~/auth.server";
import { redirect } from "@remix-run/node";

export const loader = () => redirect("/login");

export const action = ({ request }: ActionArgs) => {
  return authenticator.authenticate("whoop", request);
};
```

```ts
// app/routes/auth/whoop/callback.tsx
import type { LoaderArgs } from "@remix-run/node";
import { authenticator } from "~/auth.server";

export const loader = ({ request }: LoaderArgs) => {
  return authenticator.authenticate("whoop", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```

### Add Session Storage

```ts
// app/services/session.server.ts
import { createCookieSessionStorage } from "@remix-run/node";

export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session", // use any name you want here
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: ["s3cr3t"], // replace this with an actual secret
    secure: process.env.NODE_ENV === "production", // enable this in prod only
  },
});

export let { getSession, commitSession, destroySession } = sessionStorage;
```
