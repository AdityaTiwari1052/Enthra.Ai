import express from "express";
import { body } from "express-validator";
import { createTask, deleteTask, getTasks, updateTask } from "../Controller/taskController.js";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.use(protect);

router.get("/", asyncHandler(getTasks));
router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Task title is required"),
    body("projectId").trim().notEmpty().withMessage("projectId is required"),
    body("assignedTo").trim().notEmpty().withMessage("assignedTo is required"),
    body("status").optional().isIn(["Todo", "In Progress", "Done"]).withMessage("Invalid status")
  ],
  asyncHandler(createTask)
);
router.put("/:id", asyncHandler(updateTask));
router.delete("/:id", asyncHandler(deleteTask));

export default router;
