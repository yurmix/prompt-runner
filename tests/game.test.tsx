import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { _internal } from '../hooks/runner.tsx'

function beneath(on: On): void {
  mock.store(on)
  on('session.start', () => ({}))
  on('ui.message', () => ({}))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.focus', () => ({ value: {} }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: true,
    maxRows: 12,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 12 },
    view: {},
  },
} as const

const PANE = {
  component: 'Pane',
  requestId: 'prompt-runner',
  props: {
    title: 'Claude Run',
    isFocused: true,
    bodyColumns: 80,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 8 },
    view: {},
  },
} as const

test('the game stays out of the way until it is asked for', async ($, on) => {
  beneath(on)

  for (const surface of ['terminal', 'desktop', 'mobile', 'vscode'] as const) {
    const ui = await $.ui.mount({ plugin: 'prompt-runner', surface, ...BAND })
    expect(await ui.find({ type: 'Client' })).toBeUndefined()
    await ui.unmount()
  }
})

test('/prompt-runner opens the game, and again puts it away', async ($, on) => {
  beneath(on)

  const opened = await $.command.run({ command: 'prompt-runner', args: '' })
  expect(opened.text).toMatch(/is open/)
  const closed = await $.command.run({ command: 'prompt-runner', args: '' })
  expect(closed.text).toMatch(/put away/)
  const reopened = await $.command.run({ command: 'prompt-runner', args: '' })
  expect(reopened.text).toMatch(/is open/)
})

test('the game runs at once, ends on a crash and keeps the best score', async ($, on) => {
  beneath(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'prompt-runner', surface, ...PANE })
    await ui.resize({ columns: 80, rows: 8, in: 'game' })
    await ui.advance(400)
    expect(await ui.find({ in: 'game', text: /HI \d{5}/ })).toBeDefined()

    // Nobody jumps: the first bug ends the run.
    await ui.advance(30_000)
    expect(await ui.find({ in: 'game', text: /GAME OVER/ })).toBeDefined()

    // The score reached the hooks module, which hands the best back as HI.
    expect(await ui.find({ in: 'game', text: /HI (?!00000)\d{5}/ })).toBeDefined()

    // Space runs again.
    await ui.advance(1_000)
    await ui.key({ key: ' ', in: 'game' })
    await ui.advance(200)
    expect(await ui.find({ in: 'game', text: /GAME OVER/ })).toBeUndefined()

    await ui.unmount()
  }
})

test('a tap runs again after a crash', async ($, on) => {
  beneath(on)

  const ui = await $.ui.mount({ plugin: 'prompt-runner', surface: 'desktop', ...PANE })
  await ui.resize({ columns: 80, rows: 8, in: 'game' })
  await ui.advance(30_000)
  expect(await ui.find({ in: 'game', text: /GAME OVER/ })).toBeDefined()
  await ui.advance(1_000)
  await ui.pointer({ type: 'down', x: 20, y: 5, button: 'left', in: 'game' })
  await ui.advance(200)
  expect(await ui.find({ in: 'game', text: /GAME OVER/ })).toBeUndefined()
  await ui.unmount()
})

test('Space is the only key', async ($, on) => {
  beneath(on)

  const ui = await $.ui.mount({ plugin: 'prompt-runner', surface: 'terminal', ...PANE })
  await ui.resize({ columns: 80, rows: 8, in: 'game' })
  await ui.advance(30_000)
  await ui.advance(1_000)
  for (const key of ['up', 'down', 'w', 's', 'k', 'j']) await ui.key({ key, in: 'game' })
  await ui.advance(200)
  expect(await ui.find({ in: 'game', text: /GAME OVER/ })).toBeDefined()
  await ui.key({ key: ' ', in: 'game' })
  await ui.advance(200)
  expect(await ui.find({ in: 'game', text: /GAME OVER/ })).toBeUndefined()
  await ui.unmount()
})

test('every obstacle can be passed with the one button', () => {
  const { fresh, start, step, jump, makeObstacle } = _internal
  const WIDTH = 80

  // Run one obstacle at Claude, pressing at tick `at` (or never), and say
  // whether Claude got past it.
  const survives = (kind: Parameters<typeof makeObstacle>[0], speed: number, at: number | null): boolean => {
    const g = fresh(0)
    start(g, WIDTH)
    g.gap = Infinity
    g.dist = (speed - 1.5) * 600 * 4 // the score that sets this speed
    g.obs = [makeObstacle(kind, 60)]
    for (let t = 0; t < 200; t++) {
      if (t === at) jump(g)
      step(g, WIDTH)
      if (g.mode === 'over') return false
      if (g.obs.length === 0) return true
    }
    return true
  }

  // Swarms only show up once the speed passes 2.2.
  for (const speed of [1.5, 2.3, 3.6]) {
    expect(survives('mothHigh', speed, null)).toBe(true)
    for (const kind of ['bug', 'bugs', 'stack', 'moth'] as const) {
      if (kind === 'bugs' && speed <= 2.2) continue
      expect(survives(kind, speed, null)).toBe(false)
      const ticks = Array.from({ length: 60 }, (_, i) => i)
      expect(ticks.some(at => survives(kind, speed, at))).toBe(true)
    }
  }
})
