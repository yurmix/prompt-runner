import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const isPlaying = atom({ plugin: 'prompt-runner', key: 'isPlaying' } as const, false)
const best = atom({ plugin: 'prompt-runner', key: 'best' } as const, 0)

const PANE = 'prompt-runner'

// The shortcut the plugin binds for you, once, in ~/.claude/keybindings.json.
const KEY = 'ctrl+x g'
const ACTION = 'command:prompt-runner'

type Block = { context?: unknown; bindings?: Record<string, unknown> }

// Adds KEY -> ACTION to the person's keybindings file, unless the action is
// bound already or KEY is taken in Chat. A file that is not plain JSON (it has
// comments, say) is left alone. Resolves whether it wrote the binding.
async function bindKey($: EngineInterface): Promise<boolean> {
  const dir =
    (await $.env.get('CLAUDE_CONFIG_DIR')) ??
    `${(await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? ''}/.claude`
  if (dir === '/.claude') return false
  const path = `${dir}/keybindings.json`

  let file: { bindings: Block[] } = { bindings: [] }
  if (await $.fs.exists(path)) {
    try {
      const parsed = JSON.parse(await $.fs.read(path)) as { bindings?: unknown }
      if (!Array.isArray(parsed?.bindings)) return false
      file = parsed as { bindings: Block[] }
    } catch {
      return false
    }
  }

  const blocks = file.bindings
  if (blocks.some(b => Object.values(b?.bindings ?? {}).includes(ACTION))) return false
  let chat = blocks.find(b => b?.context === 'Chat' && b.bindings && typeof b.bindings === 'object')
  if (chat?.bindings && KEY in chat.bindings) return false
  if (!chat) {
    chat = { context: 'Chat', bindings: {} }
    blocks.push(chat)
  }
  chat.bindings = { ...chat.bindings, [KEY]: ACTION }

  await $.fs.write(path, `${JSON.stringify(file, null, 2)}\n`)
  return true
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-runner',
      description: 'Play Claude Run while you wait. Run it again, or press Esc, to put it away',
      // Runs at once while Claude is working, which is when you want it.
      immediate: true,
    })
    // Bind the shortcut the first time the plugin loads. Only once: if you
    // remove or change it later, it stays the way you left it.
    if ((await $.store.get('keyOffered')) !== true) {
      await $.store.set('keyOffered', true)
      const bound = await bindKey($).catch(() => false)
      if (bound) $.ui.toast(`Claude Run: press ${KEY} to play while you wait.`)
    }

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
