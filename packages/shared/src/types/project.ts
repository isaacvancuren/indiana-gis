import { z } from 'zod'

export const ProjectFeatureSchema = z.object({
  id: z.string(),
  feature_type: z.string(),
  geom: z.unknown(),
  properties: z.record(z.unknown()).default({}),
  label: z.string().nullable().default(null),
  // Per-feature display color (hex). Optional for backwards compatibility.
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const ProjectDataSchema = z.object({
  features: z.array(ProjectFeatureSchema).default([]),
  notes: z.string().default(''),
  settings: z.record(z.unknown()).default({}),
})

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  data: ProjectDataSchema.optional(),
})

export const UpdateProjectBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    data: ProjectDataSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.data !== undefined, {
    message: 'At least one field (name or data) is required',
  })

export const BulkProjectItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  data: ProjectDataSchema.optional(),
})

export const BulkCreateBodySchema = z.array(BulkProjectItemSchema).min(1).max(100)

export type ProjectFeature = z.infer<typeof ProjectFeatureSchema>
export type ProjectData = z.infer<typeof ProjectDataSchema>
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>
export type BulkProjectItem = z.infer<typeof BulkProjectItemSchema>
