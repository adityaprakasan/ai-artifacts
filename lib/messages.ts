import { FragmentSchema } from './schema'
import { ExecutionResult } from './types'
import { ParsedDataset, DataSummary } from './data-utils'
import { DeepPartial } from 'ai'

export type MessageText = {
  type: 'text'
  text: string
}

export type MessageCode = {
  type: 'code'
  text: string
}

export type MessageImage = {
  type: 'image'
  image: string
}

export type MessageData = {
  type: 'data'
  fileName: string
  summary: {
    rows: number
    columns: string[]
  }
  preview: any[][]
}

export type Message = {
  role: 'assistant' | 'user'
  content: Array<MessageText | MessageCode | MessageImage | MessageData>
  object?: DeepPartial<FragmentSchema>
  result?: ExecutionResult
}

export function toAISDKMessages(messages: Message[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content.map((content) => {
      if (content.type === 'code') {
        return {
          type: 'text',
          text: content.text,
        }
      }

      if (content.type === 'data') {
        return {
          type: 'text',
          text: `Dataset: ${content.fileName} with ${content.summary.rows.toLocaleString()} rows and columns: ${content.summary.columns.join(', ')}`,
        }
      }

      return content
    }),
  }))
}

export async function toMessageImage(files: File[]) {
  if (files.length === 0) {
    return []
  }

  return Promise.all(
    files.map(async (file) => {
      const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
      return `data:${file.type};base64,${base64}`
    }),
  )
}

export function toMessageData(
  file: File,
  dataset: ParsedDataset,
  summary: DataSummary
): MessageData {
  return {
    type: 'data',
    fileName: file.name,
    summary: {
      rows: summary.rowCount,
      columns: dataset.columns
    },
    preview: dataset.rows.slice(0, 10).map(row => 
      dataset.columns.map((_, index) => row[index])
    )
  }
}
