const { z } = require('zod');

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  columnId: z.string().min(1).optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  labelIds: z.array(z.string().min(1)).optional(),
});

const updateTaskSchema = taskSchema.partial();

const moveTaskSchema = z.object({
  columnId: z.string().min(1),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE']).optional(),
  position: z.number().int().min(0).optional(),
});

const commentSchema = z.object({
  content: z.string().trim().min(1).max(3000),
});

const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(3000),
});

module.exports = {
  taskSchema,
  updateTaskSchema,
  moveTaskSchema,
  commentSchema,
  updateCommentSchema,
};
