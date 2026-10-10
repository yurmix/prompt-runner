/** A best score: whole points. */
export type Score = number

declare module 'claude-code' {
  interface PluginState {
    'prompt-runner': {
      /** True after /prompt-runner hide hides the game band. */
      isHidden: boolean
      /** True while the game pane (from /prompt-runner) is open. */
      isPlaying: boolean
      /** Best score, also kept in $.store across sessions. */
      best: Score
    }
  }
}
