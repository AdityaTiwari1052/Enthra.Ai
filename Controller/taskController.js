import { validationResult } from "express-validator";
import Project from "../Models/Project.js";
import Task from "../Models/Task.js";
import User from "../Models/User.js";

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }
};

const hasProjectAccess = (project, userId) =>
  project.owner.toString() === userId.toString() ||
  project.teamMembers.some((member) => member.toString() === userId.toString());

export const createTask = async (req, res) => {
  handleValidation(req, res);
  const { title, description, projectId, assignedTo, dueDate } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (!hasProjectAccess(project, req.user._id)) {
    res.status(403);
    throw new Error("You are not part of this project");
  }

  const assignee = await User.findById(assignedTo);
  if (!assignee) {
    res.status(404);
    throw new Error("Assigned user not found");
  }

  if (!hasProjectAccess(project, assignee._id)) {
    res.status(400);
    throw new Error("Assigned user is not part of this project");
  }

  const task = await Task.create({
    title,
    description,
    project: projectId,
    assignedTo,
    dueDate,
    createdBy: req.user._id
  });

  const populated = await task.populate("project assignedTo createdBy", "name email role");
  res.status(201).json(populated);
};

export const getTasks = async (req, res) => {
  const query = {};
  if (req.query.projectId) query.project = req.query.projectId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;

  if (req.user.role === "Member") {
    query.assignedTo = req.user._id;
  }

  const tasks = await Task.find(query)
    .populate("project", "name owner teamMembers")
    .populate("assignedTo", "name email role")
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });

  const filteredTasks = tasks.filter((task) => {
    if (!task.project) return false;
    const isOwner = task.project.owner.toString() === req.user._id.toString();
    const isMember = task.project.teamMembers.some(
      (member) => member.toString() === req.user._id.toString()
    );
    return isOwner || isMember;
  });

  res.status(200).json(filteredTasks);
};

export const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id).populate("project");
  if (!task || !task.project) {
    res.status(404);
    throw new Error("Task not found");
  }

  if (!hasProjectAccess(task.project, req.user._id)) {
    res.status(403);
    throw new Error("No access to this task");
  }

  const { title, description, status, assignedTo, dueDate } = req.body;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (status !== undefined) task.status = status;

  if (assignedTo !== undefined) {
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      res.status(404);
      throw new Error("Assigned user not found");
    }
    if (!hasProjectAccess(task.project, assignee._id)) {
      res.status(400);
      throw new Error("Assigned user is not part of this project");
    }
    task.assignedTo = assignedTo;
  }

  await task.save();
  const populated = await task.populate("project assignedTo createdBy", "name email role");
  res.status(200).json(populated);
};

export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id).populate("project");
  if (!task || !task.project) {
    res.status(404);
    throw new Error("Task not found");
  }

  if (
    task.createdBy.toString() !== req.user._id.toString() &&
    task.project.owner.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Only creator or project owner can delete task");
  }

  await Task.findByIdAndDelete(task._id);
  res.status(200).json({ message: "Task deleted" });
};
