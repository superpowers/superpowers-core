import * as passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// NOTE: The regex must match the pattern and min/max lengths in client/login/index.pug
const usernameRegex = /^[A-Za-z0-9_-]{3,20}$/;

passport.serializeUser<any, string>((user, done) => { done(null, user.username); });
passport.deserializeUser((username, done) => { done(null, { username }); });

const strategy = new LocalStrategy((username, password, done) => {
  if (!usernameRegex.test(username)) return done(null, false, { message: "invalidUsername" });
  done(null, { username });
});

passport.use(strategy);

export default passport;
