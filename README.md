# Claude Run

A one-button endless-runner game for Claude Code. It's like the browser's offline dinosaur game, but you play as a pixel Claude. It stays hidden until you call it up, for example while Claude works through a long prompt. The only move is a jump: jump over bugs and stacks of failing tests, and time it so you don't jump into a hallucination moth.

```
 ▄▄▄▄                                          HI 00412  00187
▀▀▀▀▀▀▀                              ▄▄▄▄
     █▀██▀█
    ▀██████▀                  ▀▄██▄▀
     █▀  ▀█                   ▀█▀▀█▀
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
```

## Install

Type this at the prompt of a Claude Code terminal session:

```
/plugin install prompt-runner --marketplace yurmix/prompt-runner
```

Answer `y` to add the marketplace, then press Enter to pick the user scope. The plugin is active right away, in the terminal and in the desktop app's Code tab.

## Play

Run `/prompt-runner` to open the game, even while Claude is working. Run it again, or press Esc, to put the game away and get your prompt back.

Once the game is open, there is one button. It jumps, and it starts the next run after a crash.

- **Keyboard:** Space
- **Mouse or touch:** click or tap anywhere on the game

Your best score is saved between sessions.

### Open it with one key

The first time the plugin loads, it binds `ctrl+x g` to `/prompt-runner` in `~/.claude/keybindings.json` and shows a short notice. Claude Code doesn't use `ctrl+x g` for anything else. After that, `ctrl+x g` opens the game and closes it again.

It leaves your file alone if `ctrl+x g` is already taken, if you've already bound `/prompt-runner` to another key, or if the file isn't plain JSON (it has comments, for example). It only tries once, so if you remove or change the binding, it stays the way you left it.

To bind it yourself, or to pick another key, add this to `~/.claude/keybindings.json`:

```json
{
  "bindings": [
    {
      "context": "Chat",
      "bindings": { "ctrl+x g": "command:prompt-runner" }
    }
  ]
}
```

If the file already has a `bindings` list, add the block to it. `ctrl+d` won't work, because Claude Code reserves it for exit.

## Obstacles

- **Bug**: a small red bug. Jump over it.
- **Bug swarm**: two bugs together. They start showing up once you're running fast.
- **Failing test stack**: a grey stack, taller than a bug.
- **Hallucination moth**: a purple moth. A low one skims the ground, so jump it like a bug. A high one flies over you, so don't jump until it has passed.

The game speeds up as you go, and the score flashes at every 100.

## Where it runs

The game uses the Claude Code plugin API's `Client` element, which only the terminal and the Claude desktop app draw. On the mobile app and VS Code, `/prompt-runner` opens a note saying so instead.

## Development

```
claude plugin validate .
claude plugin test .
```

`hooks/register.tsx` is the hooks module. It adds the `/prompt-runner` command, opens and closes the game's pane, and keeps the best score. `hooks/runner.tsx` is the game itself, drawn with half-block characters so each terminal cell holds two pixels.

## License

MIT
