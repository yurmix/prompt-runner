import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isHidden = atom({ plugin: 'prompt-runner', key: 'isHidden' } as const, false)
const isPlaying = atom({ plugin: 'prompt-runner', key: 'isPlaying' } as const, false)
const best = atom({ plugin: 'prompt-runner', key: 'best' } as const, 0)

const PANE = 'prompt-runner'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-runner',
      description: 'Play Claude Run, the endless runner. "hide" or "show" toggles the game above the prompt',
      argumentHint: '[hide | show]',
    })
    const saved = Number((await $.store.get('best')) ?? 0)
    if (Number.isFinite(saved) && saved > 0) {
      await update($, best, n => Math.max(n ?? 0, saved))
    }
    if ((await $.store.get('isHidden')) === true) await update($, isHidden, () => true)

    return next(e)
  })

  // /prompt-runner        opens the game with the keyboard on it (Esc leaves)
  // /prompt-runner hide   removes the game strip above the prompt
  // /prompt-runner show   brings it back
  on('command.run', { command: 'prompt-runner' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()

    if (arg === 'hide' || arg === 'show') {
      const hidden = arg === 'hide'
      await update($, isHidden, () => hidden)
      await $.store.set('isHidden', hidden)
      return {
        text: hidden
          ? 'Claude Run is hidden. Run /prompt-runner show to bring it back, or /prompt-runner to play anyway.'
          : 'Claude Run is back above the prompt. Click or tap it to play.',
      }
    }

    await update($, isPlaying, () => true)
    await $.ui.open({ id: PANE, title: 'Claude Run', focus: true, closeOnEscape: true, rows: 8 })
    await $.ui.focus({ requestId: PANE, key: 'game' }).catch(() => ({}))

    return {
      text: 'Claude Run is open. Space or Up jumps, Down ducks, Esc returns to the prompt.',
    }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    await update($, isPlaying, () => false)
    return next(e)
  })

  // The game strip lives in the band above the prompt, the empty space
  // under the conversation. Only terminal and desktop draw a Client, so
  // other surfaces keep their usual band.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    if (await read($, isHidden)) return next(e)
    if (await read($, isPlaying)) return next(e) // the pane has the game

    const { Client } = $.ui.resolve(e)
    const top = await read($, best)

    return (
      <Client
        key="game"
        module="./runner.tsx"
        width={e.props.bodyColumns}
        props={{ best: top, columns: e.props.bodyColumns }}
      />
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const top = await read($, best)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>Claude Run plays in the terminal and the desktop app.</Text>
    }
    const { Client } = $.ui.resolve(e)

    return (
      <Client
        key="game"
        module="./runner.tsx"
        width={e.props.bodyColumns}
        props={{ best: top, columns: e.props.bodyColumns, autoStart: true }}
      />
    )
  })

  // The game posts { score } when a run ends; keep the best one.
  on('ui.message', async ($, e, next) => {
    const data = e.data as { score?: unknown } | null
    const score = typeof data?.score === 'number' ? Math.floor(data.score) : NaN
    if (Number.isFinite(score) && score > 0 && score > (await read($, best))) {
      await update($, best, n => Math.max(n ?? 0, score))
      await $.store.set('best', score)
    }

    return next(e)
  })
}
