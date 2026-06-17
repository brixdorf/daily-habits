const bcrypt = require("bcryptjs");

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.redirect("/login");
}

async function verifyCredentials(username, password) {
  const validUser = username === process.env.ADMIN_USERNAME;
  if (!validUser) return false;
  return bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
}

module.exports = { requireAuth, verifyCredentials };
