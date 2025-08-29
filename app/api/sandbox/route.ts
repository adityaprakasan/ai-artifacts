import { FragmentSchema } from '@/lib/schema'
import { ExecutionResultInterpreter, ExecutionResultWeb } from '@/lib/types'
import { Sandbox } from '@e2b/code-interpreter'

const sandboxTimeout = 10 * 60 * 1000 // 10 minute in ms

export const maxDuration = 60

export async function POST(req: Request) {
  const {
    fragment,
    userID,
    teamID,
    accessToken,
    rawFiles,
  }: {
    fragment: FragmentSchema
    userID: string | undefined
    teamID: string | undefined
    accessToken: string | undefined
    rawFiles?: { fileName: string; contentBase64: string }[]
  } = await req.json()
  console.log('fragment', fragment)
  console.log('userID', userID)
  console.log('rawFiles count:', rawFiles?.length || 0)
  if (rawFiles && rawFiles.length > 0) {
    console.log('rawFiles names:', rawFiles.map(f => f.fileName))
  }
  console.log('🪣 Starting sandbox creation...')
  // console.log('apiKey', apiKey)

  // Create an interpreter or a sandbox
  console.log('🏗️ Creating sandbox with template:', fragment.template)
  const sandboxStartTime = Date.now()
  const sbx = await Sandbox.create(fragment.template, {
    metadata: {
      template: fragment.template,
      userID: userID ?? '',
      teamID: teamID ?? '',
    },
    timeoutMs: sandboxTimeout,
    ...(teamID && accessToken
      ? {
          headers: {
            'X-Supabase-Team': teamID,
            'X-Supabase-Token': accessToken,
          },
        }
      : {}),
  })
  const sandboxEndTime = Date.now()
  console.log('✅ Sandbox created in', sandboxEndTime - sandboxStartTime, 'ms, sandboxId:', sbx.sandboxId)

  // Install packages
  if (fragment.has_additional_dependencies) {
    console.log('📦 Installing dependencies...')
    const depStartTime = Date.now()
    await sbx.commands.run(fragment.install_dependencies_command)
    const depEndTime = Date.now()
    console.log(
      `✅ Installed dependencies in ${depEndTime - depStartTime} ms: ${fragment.additional_dependencies.join(', ')} in sandbox ${sbx.sandboxId}`,
    )
  }

  // Copy code to fs
  if (fragment.code && Array.isArray(fragment.code)) {
    fragment.code.forEach(async (file) => {
      await sbx.files.write(file.file_path, file.file_content)
      console.log(`Copied file to ${file.file_path} in ${sbx.sandboxId}`)
    })
  } else {
    await sbx.files.write(fragment.file_path, fragment.code)
    console.log(`Copied file to ${fragment.file_path} in ${sbx.sandboxId}`)
  }

  // Transfer uploaded data files to sandbox
  if (rawFiles && rawFiles.length > 0) {
    try {
      console.log(`📁 Transferring ${rawFiles.length} data files to sandbox...`)
      // Create data directory in sandbox
      await sbx.files.makeDir('data')
      console.log(`Created data directory in ${sbx.sandboxId}`)

      // Write each data file to the sandbox
      for (const file of rawFiles) {
        const fileBuffer = Buffer.from(file.contentBase64, 'base64')
        await sbx.files.write(`data/${file.fileName}`, fileBuffer)
        console.log(`Copied data file ${file.fileName} to data/ in ${sbx.sandboxId}`)
      }
      console.log(`✅ Successfully transferred ${rawFiles.length} data files`)
    } catch (error) {
      console.error('Error transferring data files to sandbox:', error)
      // Continue execution even if file transfer fails
    }
  }

  // Execute code or return a URL to the running sandbox
  if (fragment.template === 'code-interpreter-v1') {
    // For code-interpreter-v1, always expect a string (single file)
    const codeToExecute = typeof fragment.code === 'string' ? fragment.code : ''
    console.log('🚀 Executing code...')
    const execStartTime = Date.now()
    const { logs, error, results } = await sbx.runCode(codeToExecute)
    const execEndTime = Date.now()
    console.log('✅ Code executed in', execEndTime - execStartTime, 'ms')

    return new Response(
      JSON.stringify({
        sbxId: sbx?.sandboxId,
        template: fragment.template,
        stdout: logs.stdout,
        stderr: logs.stderr,
        runtimeError: error,
        cellResults: results,
      } as ExecutionResultInterpreter),
    )
  }

  return new Response(
    JSON.stringify({
      sbxId: sbx?.sandboxId,
      template: fragment.template,
      url: `https://${sbx?.getHost(fragment.port || 80)}`,
    } as ExecutionResultWeb),
  )
}
