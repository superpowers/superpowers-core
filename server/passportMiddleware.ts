import * as passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { server as serverConfig } from "./config";

// NOTE: The regex must match the pattern and min/max lengths in client/login/index.pug
const usernameRegex = /^[A-Za-z0-9_-]{3,20}$/;

passport.serializeUser<any, string>((user, done) => { done(null, user.username); });
passport.deserializeUser((username, done) => { done(null, { username }); });

const strategy = new LocalStrategy((username, password, done) => {
  if (!usernameRegex.test(username)) return done(null, false, { message: "invalidUsername" });
  if (serverConfig.password.length > 0 && password !== serverConfig.password) return done(null, false, { message: "invalidCredentials" });

  done(null, { username });
});

passport.use(strategy);

export default passport;
