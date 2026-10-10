# Claude Run

A one-button endless-runner game for Claude Code. It's like the browser's offline dinosaur game, but you play as a pixel Claude. Claude waits in the empty strip above your prompt. The only move is a jump: jump over bugs and stacks of failing tests, and time it so you don't jump into a hallucination moth.

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

Answer `y` to add the marketplace, then press Enter to pick the user scope. The game is active right away, and it also shows up in the desktop app's Code tab.

## Play

There is one button. It starts a run, jumps, and starts the next run after a crash.

| Where | The button |
| --- | --- |
| Touch screen | Tap anywhere on the game |
| Desktop app (Code tab) | Space, or click anywhere on the game |
| Terminal, with a mouse | Click the strip above the prompt, then Space or click |
| Terminal, keyboard only | Run `/prompt-runner`, then Space |

At an empty prompt, Space types a space. So in the terminal the game only takes keys after you click it or run `/prompt-runner`. That command opens the game in a focused pane, and Esc hands the keyboard back to your prompt.

Other commands:

- `/prompt-runner hide` removes the strip above the prompt.
- `/prompt-runner show` brings it back.

Your best score is saved between sessions.

## Obstacles

- **Bug**: a small red bug. Jump over it.
- **Bug swarm**: two bugs together. They start showing up once you're running fast.
- **Failing test stack**: a grey stack, taller than a bug.
- **Hallucination moth**: a purple moth. A low one skims the ground, so jump it like a bug. A high one flies over you, so don't jump until it has passed.

The game speeds up as you go, and the score flashes at every 100.

## Where it runs

The game uses the Claude Code plugin API's `Client` element, which only the terminal and the Claude desktop app draw. On the mobile app and VS Code, the strip above the prompt stays as it was.

## Development

```
claude plugin validate .
claude plugin test .
```

`hooks/register.tsx` is the hooks module. It places the game above the prompt, adds the `/prompt-runner` command, and keeps the best score. `hooks/runner.tsx` is the game itself, drawn with half-block characters so each terminal cell holds two pixels.

## License

MIT
