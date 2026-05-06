import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Project from "../Models/Project.js";
import User from "../Models/User.js";
import Task from "../Models/Task.js";

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }
};

const isProjectMember = (project, userId) =>
  project.owner.toString() === userId.toString() ||
  project.teamMembers.some((member) => member.toString() === userId.toString());

export const createProject = async (req, res) => {
  handleValidation(req, res);

  const { name, description, teamMembers = [] } = req.body;
  const validMembers = teamMembers.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const memberDocs = await User.find({ _id: { $in: validMembers } }).select("_id");

  const uniqueMembers = [...new Set(memberDocs.map((m) => m._id.toString()))];
  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    teamMembers: uniqueMembers
  });

  const populated = await project.populate("owner teamMembers", "name email role");
  res.status(201).json(populated);
};

export const getProjects = async (req, res) => {
  const userId = req.user._id.toString();

  // Base filter: user is owner or team member
  const baseFilter = {
    $or: [{ owner: req.user._id }, { teamMembers: req.user._id }]
  };

  // Also include projects where user has assigned tasks (even if not in teamMembers)
  const assignedTasks = await Task.find({ assignedTo: req.user._id }).select("project");
  const projectIdsFromTasks = [...new Set(assignedTasks.map((t) => t.project.toString()))];

  // Combine: projects where user is member/owner OR has tasks assigned
  const allProjectIds = new Set();

  // Add projects from base filter
  const baseProjects = await Project.find(baseFilter).select("_id");
  baseProjects.forEach((p) => allProjectIds.add(p._id.toString()));

  // Add projects from assigned tasks
  projectIdsFromTasks.forEach((id) => allProjectIds.add(id));

  const finalProjects = await Project.find({
    _id: { $in: [...allProjectIds].map((id) => mongoose.Types.ObjectId(id)) }
  })
    .populate("owner", "name email role")
    .populate("teamMembers", "name email role")
    .sort({ createdAt: -1 });

  res.status(200).json(finalProjects);
};

export const updateProject = async (req, res) => {
  handleValidation(req, res);

  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only project owner can update project");
  }

  const { name, description, teamMembers } = req.body;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;

  if (teamMembers !== undefined && Array.isArray(teamMembers)) {
    const validMembers = teamMembers.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const members = await User.find({ _id: { $in: validMembers } }).select("_id");
    project.teamMembers = [...new Set(members.map((m) => m._id.toString()))];
  }

  await project.save();
  const populated = await project.populate("owner teamMembers", "name email role");
  res.status(200).json(populated);
};

export const deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only project owner can delete project");
  }

  await Project.findByIdAndDelete(project._id);
  res.status(200).json({ message: "Project deleted" });
};

export const addTeamMember = async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error("Invalid user id");
  }

  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only project owner can add team members");
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!isProjectMember(project, userId)) {
    project.teamMembers.push(userId);
    await project.save();
  }

  const populated = await project.populate("owner teamMembers", "name email role");
  res.status(200).json(populated);
};
