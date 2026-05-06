import express from "express";
import { body } from "express-validator";
import { login, signup } from "../Controller/authController.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("role").optional().isIn(["Admin", "Member"]).withMessage("Invalid role")
  ],
  asyncHandler(signup)
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  asyncHandler(login)
);

export default router;
