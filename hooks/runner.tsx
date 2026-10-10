import type { ClientModule, ClientSurface, RenderElement } from 'claude-code'

// Claude Run: a one-button endless runner drawn with half-block characters,
// so each terminal cell holds two square-ish pixels (top and bottom). The
// only move is a jump: tap anywhere on touch, or press Space on a keyboard.

type Props = { best?: number; columns?: number; autoStart?: boolean }

type Kind = 'bug' | 'bugs' | 'stack' | 'moth' | 'mothHigh'
type Obstacle = { kind: Kind; x: number; top: number; w: number; hgt: number }
type Cloud = { x: number; y: number }

type Game = {
  mode: 'idle' | 'run' | 'over'
  t: number
  overAt: number
  jump: number // pixels above the ground
  vy: number
  speed: number
  dist: number
  score: number
  best: number
  posted: boolean
  obs: Obstacle[]
  clouds: Cloud[]
  gap: number
  flash: number
}

const TICK_MS = 40
const FIELD_H = 14 // pixels: 7 rows of cells
const FEET = 11 // the avatar's lowest pixel row when on the ground
const GROUND = 12
const PEBBLES = 13
const AV_X = 4
const GRAVITY = 0.32
const JUMP_V = 2.0

// One character per pixel; '.' is empty.
const COLORS: Record<string, string> = {
  O: 'claude',
  K: '#1b1a18',
  R: 'error',
  G: '#9b978f',
  g: '#6e6a63',
  P: '#a990f0',
  c: 'subtle',
  _: 'inactive',
}

const BODY = ['.OOOOOO.', '.OKOOKO.', 'OOOOOOOO', '.OOOOOO.']
const BODY_BLINK = ['.OOOOOO.', '.OOOOOO.', 'OOOOOOOO', '.OOOOOO.']
const BODY_DEAD = ['.OOOOOO.', '.OROORO.', 'OOOOOOOO', '.OOOOOO.']
const LEGS_A = ['.OO..OO.', '.O....O.']
const LEGS_B = ['.OO..OO.', '..O..O..']
const LEGS_AIR = ['.OO..OO.', '........']

const SPRITES: Record<Kind, string[][]> = {
  bug: [['R.RR.R', '.RRRR.', 'RRRRRR', '.R..R.']],
  bugs: [['R.RR.R.R.RR.R', '.RRRR...RRRR.', 'RRRRRR.RRRRRR', '.R..R...R..R.']],
  stack: [['GGGG', 'gggg', 'GGGG', 'gggg', 'GGGG']],
  moth: [
    ['P.....P', '.PPPPP.', '..P.P..'],
    ['.......', 'PPPPPPP', '..P.P..'],
  ],
  mothHigh: [
    ['P.....P', '.PPPPP.', '..P.P..'],
    ['.......', 'PPPPPPP', '..P.P..'],
  ],
}
const CLOUD = ['..cccc..', 'cccccccc']
const CLOUD_W = 8

// The one button: Space, however the host names it.
const BUTTON_KEYS = new Set([' ', 'space'])

function fresh(best: number): Game {
  return {
    mode: 'idle',
    t: 0,
    overAt: 0,
    jump: 0,
    vy: 0,
    speed: 1.5,
    dist: 0,
    score: 0,
    best,
    posted: false,
    obs: [],
    clouds: [],
    gap: 0,
    flash: 0,
  }
}

function start(g: Game, width: number): void {
  g.mode = 'run'
  g.t = 0
  g.jump = 0
  g.vy = 0
  g.speed = 1.5
  g.dist = 0
  g.score = 0
  g.posted = false
  g.obs = []
  g.clouds = [
    { x: Math.floor(width * 0.3), y: 1 },
    { x: Math.floor(width * 0.75), y: 3 },
  ]
  g.gap = width * 0.6
  g.flash = 0
}

function makeObstacle(kind: Kind, x: number): Obstacle {
  const art = SPRITES[kind][0] ?? []
  const w = art[0]?.length ?? 0
  const hgt = art.length
  // A low moth skims the ground, so jump it like a bug. A high moth flies
  // over a running Claude but meets a jumping one, so don't press.
  const top = kind === 'moth' ? FEET - hgt : kind === 'mothHigh' ? 1 : FEET - hgt + 1
  return { kind, x, top, w, hgt }
}

function pickKind(g: Game): Kind {
  const roll = Math.random()
  if (g.score > 150 && roll < 0.2) return Math.random() < 0.6 ? 'moth' : 'mothHigh'
  if (g.speed > 2.2 && roll < 0.4) return 'bugs'
  if (g.score > 40 && roll < 0.65) return 'stack'
  return 'bug'
}

function avatarBox(g: Game): [number, number, number, number] {
  const bottom = Math.round(FEET - g.jump)
  return [AV_X + 1, bottom - 5, AV_X + 6, bottom]
}

function hits(g: Game, o: Obstacle): boolean {
  const [ax0, ay0, ax1, ay1] = avatarBox(g)
  const ox0 = Math.round(o.x) + 1
  const ox1 = Math.round(o.x) + o.w - 2
  const oy0 = o.top
  const oy1 = o.top + o.hgt - 1
  return ax0 <= ox1 && ax1 >= ox0 && ay0 <= oy1 && ay1 >= oy0
}

function jump(g: Game): void {
  if (g.jump <= 0 && g.vy === 0) g.vy = JUMP_V
}

function step(g: Game, width: number): void {
  g.t++
  if (g.mode !== 'run') return

  // Avatar
  if (g.vy !== 0 || g.jump > 0) {
    g.jump += g.vy
    g.vy -= GRAVITY
    if (g.jump <= 0) {
      g.jump = 0
      g.vy = 0
    }
  }

  // World
  g.speed = Math.min(3.6, 1.5 + g.score / 600)
  g.dist += g.speed
  const before = Math.floor(g.score / 100)
  g.score = Math.floor(g.dist * 0.25)
  if (Math.floor(g.score / 100) > before) g.flash = 24
  if (g.flash > 0) g.flash--

  for (const o of g.obs) o.x -= g.speed
  g.obs = g.obs.filter(o => o.x + o.w > -2)
  for (const c of g.clouds) {
    c.x -= g.speed * 0.25
    if (c.x < -CLOUD_W) {
      c.x = width + Math.random() * 20
      c.y = 1 + Math.floor(Math.random() * 3)
    }
  }

  g.gap -= g.speed
  if (g.gap <= 0) {
    g.obs.push(makeObstacle(pickKind(g), width))
    g.gap = g.speed * 14 + 10 + Math.random() * (g.speed * 22 + 24)
  }

  for (const o of g.obs) {
    if (hits(g, o)) {
      g.mode = 'over'
      g.overAt = g.t
      g.best = Math.max(g.best, g.score)
      break
    }
  }
}

// Drawing ------------------------------------------------------------------

type Pixels = { width: number; height: number; px: (string | undefined)[] }

function canvas(width: number, height: number): Pixels {
  return { width, height, px: new Array(width * height).fill(undefined) }
}

function blit(c: Pixels, art: string[], x: number, y: number): void {
  const x0 = Math.round(x)
  for (let r = 0; r < art.length; r++) {
    const py = y + r
    if (py < 0 || py >= c.height) continue
    const line = art[r] ?? ''
    for (let i = 0; i < line.length; i++) {
      const color = COLORS[line[i] ?? '.']
      const px = x0 + i
      if (!color || px < 0 || px >= c.width) continue
      c.px[py * c.width + px] = color
    }
  }
}

function avatarArt(g: Game): { art: string[]; y: number } {
  if (g.mode === 'over') {
    return { art: [...BODY_DEAD, ...LEGS_AIR], y: Math.round(FEET - g.jump) - 5 }
  }
  const blink = g.mode === 'idle' && g.t % 90 < 4
  const body = blink ? BODY_BLINK : BODY
  const legs =
    g.mode === 'idle' ? LEGS_A : g.jump > 0 ? LEGS_AIR : Math.floor(g.t / 3) % 2 ? LEGS_A : LEGS_B
  return { art: [...body, ...legs], y: Math.round(FEET - g.jump) - 5 }
}

function drawField(g: Game, width: number): Pixels {
  const c = canvas(width, FIELD_H)
  for (const cl of g.clouds) blit(c, CLOUD, cl.x, cl.y)
  for (let x = 0; x < width; x++) {
    c.px[GROUND * width + x] = COLORS._
    if ((Math.imul(x + Math.floor(g.dist), 2654435761) >>> 0) % 19 === 0) c.px[PEBBLES * width + x] = COLORS._
  }
  for (const o of g.obs) {
    const frames = SPRITES[o.kind]
    blit(c, frames[Math.floor(g.t / 6) % frames.length] ?? [], o.x, o.top)
  }
  const a = avatarArt(g)
  blit(c, a.art, AV_X, a.y)
  return c
}

type Run = { text: string; fg?: string; bg?: string }

function rowsOf(c: Pixels): Run[][] {
  const rows: Run[][] = []
  for (let y = 0; y < c.height; y += 2) {
    const runs: Run[] = []
    for (let x = 0; x < c.width; x++) {
      const top = c.px[y * c.width + x]
      const bot = y + 1 < c.height ? c.px[(y + 1) * c.width + x] : undefined
      let ch = ' '
      let fg: string | undefined
      let bg: string | undefined
      if (top && bot) {
        if (top === bot) {
          ch = '█'
          fg = top
        } else {
          ch = '▀'
          fg = top
          bg = bot
        }
      } else if (top) {
        ch = '▀'
        fg = top
      } else if (bot) {
        ch = '▄'
        fg = bot
      }
      const last = runs[runs.length - 1]
      if (last && last.fg === fg && last.bg === bg) last.text += ch
      else runs.push({ text: ch, fg, bg })
    }
    rows.push(runs)
  }
  return rows
}

function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(5, '0')
}

function draw(g: Game, width: number, surface: ClientSurface<Game>): RenderElement {
  const { Box, Text } = surface.elements

  const paint = (runs: Run[]): RenderElement[] =>
    runs.map(r =>
      r.fg && r.bg ? (
        <Text color={r.fg} backgroundColor={r.bg}>{r.text}</Text>
      ) : r.fg ? (
        <Text color={r.fg}>{r.text}</Text>
      ) : (
        <Text>{r.text}</Text>
      ),
    )

  if (g.mode === 'idle') {
    // A compact strip: Claude waiting on a patch of ground, and the hint.
    const c = canvas(12, 8)
    for (let x = 0; x < 12; x++) c.px[6 * 12 + x] = COLORS._
    const a = avatarArt(g)
    blit(c, a.art, 2, a.y - (FEET - 5))
    const rows = rowsOf(c)
    const hint =
      width >= 70
        ? 'Tap or press Space to play. One button: jump.'
        : 'Tap or Space to play and jump'
    return (
      <Box flexDirection="row">
        <Box flexDirection="column">
          {rows.map(runs => (
            <Box flexDirection="row">{paint(runs)}</Box>
          ))}
        </Box>
        <Box flexDirection="column" paddingLeft={1}>
          <Text> </Text>
          <Text bold color="claude">Claude Run</Text>
          <Text dimColor wrap="truncate-end">{hint}</Text>
          <Text dimColor>{g.best > 0 ? `Best ${g.best}` : ' '}</Text>
        </Box>
      </Box>
    )
  }

  const rows = rowsOf(drawField(g, width))
  const showScore = g.flash === 0 || Math.floor(g.flash / 4) % 2 === 0
  const scoreText = `HI ${pad(Math.max(g.best, g.score))}  ${showScore ? pad(g.score) : '     '}`
  const left =
    g.mode === 'over'
      ? width >= 60
        ? 'GAME OVER · tap or press Space to run again'
        : 'GAME OVER · tap or Space'
      : 'Tap or Space to jump'

  return (
    <Box flexDirection="column" width={width}>
      <Box flexDirection="row" justifyContent="space-between">
        {g.mode === 'over' ? (
          <Text bold color="claude" wrap="truncate-end">{left}</Text>
        ) : (
          <Text dimColor wrap="truncate-end">{left}</Text>
        )}
        <Text color="text">{scoreText}</Text>
      </Box>
      {rows.map(runs => (
        <Box flexDirection="row">{paint(runs)}</Box>
      ))}
    </Box>
  )
}

const Runner: ClientModule<Props, Game> = (props, surface) => {
  const width = Math.max(30, surface.columns > 0 ? surface.columns : (props?.columns ?? 60))
  const known = Math.max(0, props?.best ?? 0)

  let g = surface.state
  if (g === undefined) {
    g = fresh(known)
    const s = surface
    if (props?.autoStart) start(g, width)
    s.setState(g)

    // The one button: start, jump, or run again.
    const press = (): void => {
      const cur = s.state
      if (!cur) return
      const w = Math.max(30, s.columns > 0 ? s.columns : 60)
      if (cur.mode === 'idle') {
        start(cur, w)
      } else if (cur.mode === 'over') {
        if (cur.t - cur.overAt < 8) return // ignore the press that was mid-flight
        start(cur, w)
      } else {
        jump(cur)
      }
      s.setState({ ...cur })
    }

    s.every(TICK_MS, () => {
      const cur = s.state
      if (!cur) return
      const w = Math.max(30, s.columns > 0 ? s.columns : 60)
      const wasRunning = cur.mode === 'run'
      step(cur, w)
      if (cur.mode === 'run') {
        s.setState({ ...cur })
      } else if (wasRunning) {
        // The run just ended: redraw once and report the score.
        if (!cur.posted && cur.score > 0) {
          cur.posted = true
          s.post({ score: cur.score })
        }
        s.setState({ ...cur })
      } else if (cur.mode === 'idle' && (cur.t % 90 === 0 || cur.t % 90 === 4)) {
        s.setState({ ...cur }) // blink
      }
    })

    s.onKey(ev => {
      if (ev.ctrl || ev.meta) return
      if (BUTTON_KEYS.has(ev.key.toLowerCase())) press()
    })

    s.onPointer(ev => {
      if (ev.type === 'down') press() // a tap or click anywhere
    })
  }

  if (known > g.best) g.best = known
  return draw(g, width, surface)
}

export default Runner

// Exposed for tests.
export const _internal = { fresh, start, step, jump, hits, makeObstacle, FEET }
