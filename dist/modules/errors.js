"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInputErrors = void 0;
var express_validator_1 = require("express-validator");
// This functions checks if there are validation errors, 
// and then settings a response code and shows the error in the response.
var handleInputErrors = function (req, res, next) {
    var errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        // 400 status code means the request contains the wrong thing.
        res.status(400);
        res.json({ errors: errors.array() });
    }
    else {
        //If there are no errors: continue with the next middleware or route handler.
        next();
    }
};
exports.handleInputErrors = handleInputErrors;
//# sourceMappingURL=errors.js.map