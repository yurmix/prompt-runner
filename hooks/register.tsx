import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isPlaying = atom({ plugin: 'prompt-runner', key: 'isPlaying' } as const, false)
const best = atom({ plugin: 'prompt-runner', key: 'best' } as const, 0)

const PANE = 'prompt-runner'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-runner',
      description: 'Play Claude Run while you wait. Run it again, or press Esc, to put it away',
      // Runs at once while Claude is working, which is when you want it.
      immediate: true,
    })
    const saved = Number((await $.store.get('best')) ?? 0)
    if (Number.isFinite(saved) && saved > 0) {
      await update($, best, n => Math.max(n ?? 0, saved))
    }

    return next(e)
  })

  // /prompt-runner opens the game with the keyboard on it, and closes it if
  // it is already open. Bind it to a key ("command:prompt-runner") to make
  // that one press.
  on('command.run', { command: 'prompt-runner' }, async ($, e) => {
    if (await read($, isPlaying)) {
      await $.ui.close({ id: PANE })
      return { text: 'Claude Run is put away.' }
    }

    await update($, isPlaying, () => true)
    await $.ui.open({ id: PANE, title: 'Claude Run', focus: true, closeOnEscape: true, rows: 8 })
    await $.ui.focus({ requestId: PANE, key: 'game' }).catch(() => ({}))

    return { text: 'Claude Run is open. Space or a tap jumps. Esc puts it away.' }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    await update($, isPlaying, () => false)
    return next(e)
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
