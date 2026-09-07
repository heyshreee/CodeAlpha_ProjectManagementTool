export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  bio?: string | null;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  createdAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  ownerId: string;
  role?: ProjectRole;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number; members: number; boards: number };
  members?: ProjectMember[];
}

export interface Label {
  id: string;
  name: string;
  color?: string | null;
  _count?: { tasks: number };
}

export interface TaskLabel {
  label: Label;
}

export interface Task {
  id: string;
  projectId: string;
  boardId?: string | null;
  columnId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  creatorId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string; avatar?: string | null };
  assignee?: { id: string; name: string; avatar?: string | null };
  labels?: TaskLabel[];
  _count?: { comments: number; attachments: number };
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  color?: string | null;
  tasks?: Task[];
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  columns: Column[];
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; avatar?: string | null };
}

export interface Attachment {
  id: string;
  taskId: string;
  uploaderId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader?: { id: string; name: string; avatar?: string | null };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  status: 'UNREAD' | 'READ';
  createdAt: string;
  project?: { name: string; color?: string | null };
}

export interface Activity {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar?: string | null };
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  assignedTasks: number;
  myCompleted: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingDeadlines: (Task & { project: { id: string; name: string } })[];
  recentProjects: Project[];
}

export interface ProjectAnalytics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  completed: number;
  completionRate: number;
  inProgress: number;
  todo: number;
  backlog: number;
  overdue: number;
  workload: { id: string; name: string; avatar?: string | null; assigned: number; completed: number }[];
  last7: { date: string; created: number }[];
}
