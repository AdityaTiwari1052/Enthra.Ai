import express from "express";
import { getDashboard } from "../Controller/dashboardController.js";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/", protect, asyncHandler(getDashboard));

export default router;
