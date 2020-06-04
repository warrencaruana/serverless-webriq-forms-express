const jwt = require("jsonwebtoken");
const { APP_JWT_SECRET } = require("../config/constants");

/**
 * Verifies passed JWT is valid to authorized actions in app
 */
exports.verifyToken = (req, res, next) => {
  const token =
    req.body.token ||
    req.query.token ||
    req.headers["x-access-token"] ||
    req.headers["authorization"];

  if (!token) {
    return res.status(400).json({
      message: "Authentication failed",
      errors: [
        {
          msg: "Access token is required",
        },
      ],
    });
  } else {
    jwt.verify(token.split("Bearer ")[1], APP_JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          message: "Authentication failed",
          errors: [
            {
              msg: "Failed to authenticate token",
              err,
            },
          ],
        });
      } else {
        console.log("jwt decoded", decoded);
        req.decoded = decoded;
        next();
      }
    });
  }
};
