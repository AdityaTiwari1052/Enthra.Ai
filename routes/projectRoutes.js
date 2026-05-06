import express from "express";
import { body } from "express-validator";
import { addTeamMember, createProject, deleteProject, getProjects, updateProject } from "../Controller/projectController.js";
import { authorize, protect } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.use(protect);

router.get("/", asyncHandler(getProjects));
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Project name is required"),
    body("description").optional().isString(),
    body("teamMembers").optional().isArray().withMessage("teamMembers must be an array")
  ],
  asyncHandler(createProject)
);
router.put(
  "/:id",
  authorize("Admin"),
  [
    body("name").optional().trim().notEmpty().withMessage("Project name cannot be empty"),
    body("description").optional().isString(),
    body("teamMembers").optional().isArray().withMessage("teamMembers must be an array")
  ],
  asyncHandler(updateProject)
);
router.delete("/:id", authorize("Admin"), asyncHandler(deleteProject));
router.post("/:id/members", authorize("Admin"), asyncHandler(addTeamMember));

export default router;
