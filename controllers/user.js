const uuid = require("uuid/v4");
const bcrypt = require("bcrypt-nodejs");
const jwt = require("jsonwebtoken");

const { users } = require("../services/db");
const {
  APP_JWT_SECRET,
  WEBRIQ_DEFAULT_USER,
  WEBRIQ_DEFAULT_PASSWORD,
} = require("../config/constants");

/**
 * GET /setup/users/admin
 */
exports.setupAdminUser = async (req, res, next) => {
  try {
    const generateHashPassword = (password) => {
      return new Promise((resolve, reject) => {
        bcrypt.genSalt(10, (err, salt) => {
          if (err) eject(err);
          bcrypt.hash(password, salt, null, (err, hash) => {
            if (err) reject(err);

            resolve(hash);
          });
        });
      });
    };

    const data = {
      _id: uuid(),
      email: WEBRIQ_DEFAULT_USER,
      password: await generateHashPassword(WEBRIQ_DEFAULT_PASSWORD),
    };

    const result = await users.create(data);

    res
      .status(201)
      .json({ message: "Successfully created user with email: " + data.email });
  } catch (error) {
    console.log("error", error);
    res.status(400).json({
      error: "Could not create user!",
      message: error && error.message,
    });
    return;
  }
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = async (req, res, next) => {
  try {
    const result = await users.getByEmail(req.body.email);

    if (!result || result.Count !== 1) {
      return res.status(403).json({
        message: "Authentication failed",
        errors: [
          {
            msg: "Invalid email",
          },
        ],
      });
    }

    if (!req.body.password) {
      return res
        .status(400)
        .json({ message: "Missing password field to login!" });
    }

    const user = result.Items[0];
    const checkUserPassword = (user, password) => {
      return new Promise((resolve, reject) => {
        bcrypt.compare(password, user.password, (err, result) => {
          if (!result) {
            console.log("Password does not match!", err);
            reject(err);
          }

          resolve(user);
        });
      });
    };

    const createToken = (data) => {
      return new Promise((resolve, reject) => {
        try {
          let payload = {
            email: data.email,
          };

          resolve({
            ...payload,
            token: jwt.sign(payload, APP_JWT_SECRET, {
              expiresIn: "6h",
            }),
          });
        } catch (err) {
          reject(err);
        }
      });
    };

    const sendResponse = (data) => {
      res.json(data);
    };

    return await checkUserPassword(user, req.body.password)
      .then(createToken)
      .then(sendResponse);
  } catch (err) {
    console.log("err", err);
    return res.status(500).json(err);
  }

  User.findOne(
    {
      email: req.body.email,
    },
    function (err, user) {
      if (err) throw err;
      if (!user) {
        return res.status(403).json({
          message: "Authentication failed",
          errors: [
            {
              msg: "Invalid email",
            },
          ],
        });
      } else if (user) {
        bcrypt.compare(req.body.password, user.password, (err, result) => {
          if (!result) {
            return res.status(403).json({
              message: "Authentication failed",
              errors: [
                {
                  msg: "Invalid password",
                },
              ],
            });
          } else {
            let payload = {
              email: user.email,
              password: process.env.WEBRIQ_DEFAULT_PASSWORD,
            };

            return res.status(200).json({
              token: jwt.sign(payload, APP_JWT_SECRET, {
                expiresIn: "6h",
              }),
            });
          }
        });
      }
    }
  );
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  res.status(200).send({ token: null });
};
