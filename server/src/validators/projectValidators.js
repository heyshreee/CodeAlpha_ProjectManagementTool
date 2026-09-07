const { z } = require('zod');

const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

const updateProjectSchema = projectSchema.partial();

const inviteMemberSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

const boardSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const columnSchema = z.object({
  title: z.string().trim().min(1).max(80),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

module.exports = {
  projectSchema,
  updateProjectSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  boardSchema,
  columnSchema,
  reorderSchema,
};
