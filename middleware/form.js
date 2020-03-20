const { checkSchema, validationResult, isE } = require("express-validator");
const get = require("lodash.get");
const removeSiteProtocols = require("../helpers").removeSiteProtocols;

// validate fields
// sanity fields
// const createForm = () =>
//   checkSchema(
//     {
//       name: {
//         in: ["body"],
//         errorMessage: "Name should be string!",
//         optional: { options: { nullable: true } },
//         isString: true,
//         toString: true
//       },
//       siteUrls: {
//         in: ["body"],
//         isArray: true,
//         errorMessage:
//           "siteUrls is required and should be a list of site URLs from which to allow form submissions",
//         customSanitizer: {
//           options: (value, { req, location, path }) => {
//             return removeSiteProtocols(req.body.siteUrls);
//           }
//         }
//       },
//       testUrls: {
//         in: ["body"],
//         isArray: true,
//         optional: { options: { nullable: true } },
//         errorMessage:
//           "testUrls should be a list of site URLs from which to allow form submissions during development",
//         customSanitizer: {
//           options: (value, { req, location, path }) => {
//             return removeSiteProtocols(req.body.siteUrls);
//           }
//         }
//       },
//       tags: {
//         optional: {
//           nullable: true
//         },
//         isArray: true
//       },
//       uploadSize: {
//         optional: {
//           nullable: true
//         },
//         isString: true
//       },
//       recaptcha: {
//         key: {
//           isString: true,
//           optional: { options: { nullable: true } }
//         },
//         secret: {
//           isString: true,
//           optional: { options: { nullable: true } }
//         }
//       },
//       notifications: {
//         email: {
//           subject: {
//             isString: true,
//             optional: { options: { nullable: true } }
//           },
//           from: {
//             isString: true,
//             optional: { options: { nullable: true } }
//           },
//           to: {
//             isArray: true,
//             optional: { options: { nullable: true } }
//           },
//           cc: {
//             isArray: true,
//             optional: { options: { nullable: true } }
//           },
//           bcc: {
//             isArray: true,
//             optional: { options: { nullable: true } }
//           }
//         },
//         webhooks: {
//           isArray: true,
//           optional: true
//         }
//       },
//       isTest: {
//         isBoolean: true,
//         optional: { options: { checkFalsy: true } }
//       }
//     }),
//     (req, res, next) => {
//       const errors = validationResult(req);

//       if (!errors.isEmpty()) {
//         res.status(400).json({ errors: errors.array() });
//         return;
//       }

//       next();
//     }
//   );

exports.sanitizeFormData = (req, res, next) => {
  const { siteUrls, notifications } = req.body;

  const initialEmailNotificationsValue = {
    notifications: {
      email: {
        to: [],
        cc: [],
        bcc: []
      }
    }
  };

  // Set initial value
  req.body = {
    ...req.body,
    ...initialEmailNotificationsValue
  };

  ["to", "cc", "bcc"].forEach(value => {
    const currentValue = get(notifications, `email.${value}`, null);

    // Converts string to array before reaching controller
    if (currentValue && typeof currentValue === "string") {
      req.body["notifications"]["email"][value] = [currentValue];
    }
  });

  // Update notification email value
  // if (!get(req.body, "notifications.email")) {
  //   req.body = {
  //     ...req.body,
  //     ...{
  //       notifications: {
  //         email: initialEmailNotificationsValue.notifications.email
  //       }
  //     }
  //   };
  // }
  // req.body["notifications"]["email"] = get(
  //   initialEmailNotificationsValue,
  //   "notifications.email"
  // );

  // console.log("req.body", JSON.stringify(req.body, null, 2));

  // Convert string siteUrls if string
  if (siteUrls && typeof siteUrls === "string") {
    req.body.siteUrls = [siteUrls];
  }

  next();
};

// module.exports = {
//   // createForm,
//   sanitizeFormData
// };

// (exports.getForm = checkSchema({
//   checkSchema({
//     id: {
//       isUUID: true
//     }
//   });
// })),
//   (req, res, next) => {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//       res.status(422).json({ errors: errors.array() });
//       return;
//     }

//     next();
//   };
