# Claude Run

An endless-runner game for Claude Code. It's like the browser's offline dinosaur game, but you play as a pixel Claude. Claude waits in the empty strip above your prompt. Jump over bugs and stacks of failing tests, and duck under the hallucination moths.

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

| Where | Start | Jump | Duck |
| --- | --- | --- | --- |
| Desktop app (Code tab) | Click or tap the strip above the prompt | Space, Up, W, or tap the top half | Down, S, or tap the bottom half |
| Terminal, with a mouse | Click the strip above the prompt | Space, Up, W, K | Down, S, J |
| Terminal, keyboard only | Run `/prompt-runner` | Space, Up, W, K | Down, S, J |

At an empty prompt, Up already scrolls back through your history. So in the terminal the game only takes keys after you click it or run `/prompt-runner`. That command opens the game in a focused pane, and Esc hands the keyboard back to your prompt.

Other commands:

- `/prompt-runner hide` removes the strip above the prompt.
- `/prompt-runner show` brings it back.

Your best score is saved between sessions.

## Obstacles

- **Bug**: a small red bug. Jump over it.
- **Bug swarm**: two bugs together. They start showing up once you're running fast.
- **Failing test stack**: a grey stack, taller than a bug.
- **Hallucination moth**: a purple moth. A low one flies at head height, so duck. A high one flies over you, so don't jump into it.

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
