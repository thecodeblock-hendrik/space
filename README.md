# Space

A vanilla HTML, CSS and JavaScript Space Invaders game, generated with the Claude Agent SDK.

## Play

Open `index.html` in a browser, or serve the folder:

```
uv run python -m http.server
```

Controls: Arrow keys / A D to move, Space to shoot, P to pause, Enter to start.

## Regenerate

`main.py` asks Claude to write the game files into this directory. Requires Claude authentication (for example `ANTHROPIC_API_KEY` in `.env`).

```
uv run main.py
```
