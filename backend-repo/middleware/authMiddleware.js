const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No token provided (middleware)" });
    }
    const session_id = authHeader.split(" ")[1];

    let user;
    try {
      user = jwt.verify(session_id, process.env.JWT_SECRET);
      // console.log("middleware user: ", user)
    } catch (err) {
      // Try Google Auth Library JWT verification
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      try {
        const ticket = await client.verifyIdToken({
          idToken: session_id,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        user = ticket.getPayload();
      } catch (googleErr) {
        console.error(googleErr);
        return res.status(401).json({ message: "Google: Invalid session" });
      }
    }
    if (!user) {
      return res.status(401).json({ message: "No User: Invalid session" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error" });
    console.error(err);
  }
};

module.exports = authMiddleware;
