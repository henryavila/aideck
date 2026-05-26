import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import type { HandlerDecl } from '../manifest-schema.js'
import { executeFileMutation } from './file-mutation.js'
import { executeShellExec } from './shell-exec.js'
import { executeScript } from './script.js'

export async function executeComposite(
  consumerDir: string,
  decl: { type: 'composite'; steps: HandlerDecl[] },
  args: Record<string, unknown>,
  dataMap: Map<string, unknown[]>
): Promise<Result<{ stepsCompleted: number }, ErrorResponse>> {
  for (let i = 0; i < decl.steps.length; i++) {
    const step = decl.steps[i]
    let result: Result<unknown, ErrorResponse>

    if (step.type === 'file-mutation') {
      result = await executeFileMutation(consumerDir, step, args)
    } else if (step.type === 'shell-exec') {
      result = await executeShellExec(consumerDir, step, args)
    } else if (step.type === 'script') {
      result = await executeScript(consumerDir, step, args, dataMap)
    } else {
      result = await executeComposite(consumerDir, step, args, dataMap)
    }

    if (!result.ok) {
      return err({
        ...result.error,
        message: `Composite step ${i} failed: ${result.error.message}`,
      })
    }
  }

  return ok({ stepsCompleted: decl.steps.length })
}
