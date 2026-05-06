import Task from "../Models/Task.js";
import Project from "../Models/Project.js";

export const getDashboard = async (req, res) => {
  const isMember = req.user.role === "Member";

  const projectFilter = isMember
    ? { $or: [{ owner: req.user._id }, { teamMembers: req.user._id }] }
    : {};

  const projects = await Project.find(projectFilter).select("_id");
  const projectIds = projects.map((project) => project._id);

  const taskFilter = isMember
    ? { project: { $in: projectIds }, assignedTo: req.user._id }
    : { project: { $in: projectIds } };

  const tasks = await Task.find(taskFilter);

  const now = new Date();
  const overdueCount = tasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) < now && task.status !== "Done"
  ).length;

  const stats = {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    todo: tasks.filter((task) => task.status === "Todo").length,
    inProgress: tasks.filter((task) => task.status === "In Progress").length,
    done: tasks.filter((task) => task.status === "Done").length,
    overdue: overdueCount
  };

  res.status(200).json(stats);
};
