import { z } from 'zod';

export const TaskStatusEnum = z.enum(['To Do', 'In Progress', 'Done']);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskPriorityEnum = z.enum(['Low', 'Medium', 'High']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const UserRefSchema = z.object({
  _id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
});

export const TaskSchema = z.object({
  _id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid 24-character hexadecimal MongoDB ObjectId'),
  owner: z.union([z.string(), UserRefSchema]),
  title: z.string().min(1),
  description: z.string().default(''),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum,
  project: z.string(),
  assignee: z.union([z.string(), UserRefSchema]).nullable().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
  __v: z.number().int().nonnegative().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskListSchema = z.array(TaskSchema);

export const ProjectSchema = z.object({
  _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  name: z.string().min(1),
  description: z.string().optional(),
  owner: z.union([z.string(), UserRefSchema]),
  members: z.array(z.unknown()).default([]),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
  __v: z.number().int().nonnegative().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectListSchema = z.array(ProjectSchema);

export const ApiErrorSchema = z.object({
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
