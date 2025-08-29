import { Duration } from '@/lib/duration'
import {
  getModelClient,
  LLMModel,
  LLMModelConfig,
} from '@/lib/models'
import { toPrompt } from '@/lib/prompt'
import ratelimit from '@/lib/ratelimit'
import { fragmentSchema as schema } from '@/lib/schema'
import { Templates } from '@/lib/templates'
import { streamObject, LanguageModel, CoreMessage } from 'ai'

export const maxDuration = 300

const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
  : 10
const ratelimitWindow = process.env.RATE_LIMIT_WINDOW
  ? (process.env.RATE_LIMIT_WINDOW as Duration)
  : '1d'

export async function POST(req: Request) {
  const {
    messages,
    userID,
    teamID,
    template,
    model,
    config,
    rawFiles,
  }: {
    messages: CoreMessage[]
    userID: string | undefined
    teamID: string | undefined
    template: Templates
    model: LLMModel
    config: LLMModelConfig
    rawFiles?: { fileName: string; contentBase64: string }[]
  } = await req.json()

  const limit = !config.apiKey
    ? await ratelimit(
        req.headers.get('x-forwarded-for'),
        rateLimitMaxRequests,
        ratelimitWindow,
      )
    : false

  if (limit) {
    return new Response('You have reached your request limit for the day.', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.amount.toString(),
        'X-RateLimit-Remaining': limit.remaining.toString(),
        'X-RateLimit-Reset': limit.reset.toString(),
      },
    })
  }

  console.log('userID', userID)
  console.log('teamID', teamID)
  console.log('template', template)
  console.log('model', model)
  console.log('config', config)
  console.log('rawFiles count:', rawFiles?.length || 0)

  const { model: modelNameString, apiKey: modelApiKey, ...modelParams } = config
  console.log('🔧 Getting model client...')
  const modelClient = getModelClient(model, config)
  console.log('✅ Model client created:', modelClient)

  try {
    console.log('📝 Generating system prompt...')
    const systemPrompt = toPrompt(template)
    console.log('✅ System prompt generated, length:', systemPrompt.length)

    console.log('🔄 Calling streamObject...')
    const startTime = Date.now()

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000)
    })

    const streamPromise = streamObject({
      model: modelClient as LanguageModel,
      schema,
      system: systemPrompt,
      messages,
      maxRetries: 0, // do not retry on errors
      ...modelParams,
    })

    const stream = await Promise.race([streamPromise, timeoutPromise]) as any
    const endTime = Date.now()
    console.log('✅ streamObject completed in', endTime - startTime, 'ms')

    console.log('📤 Converting to text stream response...')
    const responseStartTime = Date.now()
    const response = stream.toTextStreamResponse()
    const responseEndTime = Date.now()
    console.log('✅ Response created in', responseEndTime - responseStartTime, 'ms')

    return response
  } catch (error: any) {
    const isRateLimitError =
      error && (error.statusCode === 429 || error.message.includes('limit'))
    const isOverloadedError =
      error && (error.statusCode === 529 || error.statusCode === 503)
    const isAccessDeniedError =
      error && (error.statusCode === 403 || error.statusCode === 401)

    if (isRateLimitError) {
      return new Response(
        'The provider is currently unavailable due to request limit. Try using your own API key.',
        {
          status: 429,
        },
      )
    }

    if (isOverloadedError) {
      return new Response(
        'The provider is currently unavailable. Please try again later.',
        {
          status: 529,
        },
      )
    }

    if (isAccessDeniedError) {
      return new Response(
        'Access denied. Please make sure your API key is valid.',
        {
          status: 403,
        },
      )
    }

    console.error('Error:', error)

    // Check for timeout error
    if (error.message && error.message.includes('timeout')) {
      return new Response(
        'The request timed out. The AI model took too long to respond. Please try again with a simpler query or different model.',
        {
          status: 408, // Request Timeout
        },
      )
    }

    return new Response(
      'An unexpected error has occurred. Please try again later.',
      {
        status: 500,
      },
    )
  }
}
