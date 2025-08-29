import { z } from 'zod'

// Data structure schemas from data-utils.ts
const parsedDatasetSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())).max(100) // limit preview rows
})

const dataSummarySchema = z.object({
  rowCount: z.number(),
  columnCount: z.number(),
  columnTypes: z.record(z.string())
})

const dataContextSchema = z.object({
  fileName: z.string(),
  dataset: parsedDatasetSchema,
  summary: dataSummarySchema
})

const reasoningStepSchema = z.object({
  stepNumber: z.number(),
  description: z.string(),
  reasoning: z.string(),
  findings: z.string().optional()
})

const visualizationRequestSchema = z.object({
  type: z.string(),
  description: z.string(),
  dataColumns: z.array(z.string()),
  purpose: z.string()
})

const codeFileSchema = z.object({
  file_path: z.string(),
  file_content: z.string(),
})

const rawFileSchema = z.object({
  fileName: z.string(),
  contentBase64: z.string(),
})

export const dataAnalysisSchema = z.object({
  commentary: z.string().describe('Detailed explanation of the analysis approach and methodology being used.'),
  title: z.string().describe('Concise title for the data analysis. Max 5 words.'),
  code: z.string().describe('Generated analysis code that can be executed.'),
  template: z.string().default('code-interpreter-v1').describe('Template used for code generation if applicable.'),
  file_path: z.string().describe('Relative path to the generated analysis file.'),
  additional_dependencies: z.array(z.string()).describe('Additional Python packages or dependencies required.'),
  has_additional_dependencies: z.boolean().describe('Whether additional dependencies beyond standard ones are needed.'),
  install_dependencies_command: z.string().describe('Command to install additional dependencies.'),
  port: z.number().int().min(1).max(65535).nullable().describe('Port number if a web interface is created. Null otherwise.'),

  // Optional enhanced analysis fields (commented out to prevent validation hangs)
  // analysisType: z.string().optional(),
  // analysisGoals: z.array(z.string()).optional().default([]),
  // dataContext: z.array(dataContextSchema).optional(),
  rawFiles: z.array(rawFileSchema).optional(),
  // reasoningSteps: z.array(reasoningStepSchema).optional().default([]),
  // visualizationRequests: z.array(visualizationRequestSchema).optional().default([]),
  // insights: z.array(z.string()).optional().default([]),
  // recommendations: z.array(z.string()).optional().default([]),
  // methodologyNotes: z.string().optional(),
})

// Keep backward compatibility
export const fragmentSchema = dataAnalysisSchema

export type DataAnalysisSchema = z.infer<typeof dataAnalysisSchema>
export type FragmentSchema = z.infer<typeof fragmentSchema>
