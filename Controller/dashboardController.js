import Task from "../Models/Task.js";
import Project from "../Models/Project.js";

export const getDashboard = async (req, res) => {
  const userId = req.user._id.toString();
  const isMember = req.user.role === "Member";

  // Get all projects where user has any access
  let projectFilter = { $or: [{ owner: req.user._id }, { teamMembers: req.user._id }] };

  // Also include projects where user has assigned tasks (even if not in teamMembers)
  const assignedTaskProjects = await Task.distinct("project", { assignedTo: req.user._id });
  const projectIdsSet = new Set();

  const baseProjects = await Project.find(projectFilter).select("_id");
  baseProjects.forEach((p) => projectIdsSet.add(p._id.toString()));
  assignedTaskProjects.forEach((id) => projectIdsSet.add(id.toString()));

  const projectIds = [...projectIdsSet];

  // Get all tasks the user can see
  const taskQuery = { $or: [{ assignedTo: req.user._id }] };
  if (!isMember) {
    // Admins see all tasks in accessible projects
    taskQuery.project = { $in: projectIds };
  } else {
    // Members: tasks in accessible projects OR assigned to them
    taskQuery.$or.push({ project: { $in: projectIds } });
  }

  const tasks = await Task.find(taskQuery);

  const now = new Date();
  const overdueCount = tasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) < now && task.status !== "Done"
  ).length;

  const stats = {
    totalProjects: projectIds.length,
    totalTasks: tasks.length,
    todo: tasks.filter((task) => task.status === "Todo").length,
    inProgress: tasks.filter((task) => task.status === "In Progress").length,
    done: tasks.filter((task) => task.status === "Done").length,
    overdue: overdueCount
  };

  res.status(200).json(stats);
};
