# Tic-Tac-Toe: Arena of the Gods

A mythological-themed Tic-Tac-Toe game featuring an intelligent AI powered by the Negamax algorithm with alpha-beta pruning.

## Features

- Human vs Human mode
- Human vs AI mode with three divine opponents:
  - Hermes (Easy)
  - Zeus (Medium)
  - Athena (Hard)
- Beautiful web interface with mythical theme
- Score tracking across games
- Move history with visual timeline
- Animated UI with particle effects

---

## How to Run

### Web Version (Recommended)

```bash
pip install -r requirements.txt
python app.py
```

Then open your browser to `http://localhost:5000`

### Command Line Version

```bash
python cli.py
```

---

## About the AI

The AI uses the Negamax algorithm, a simplified variant of Minimax for zero-sum games.

### What is Negamax?

Negamax is based on the principle that in a zero-sum game, what is good for one player is equally bad for the opponent. Instead of separating Min and Max players, Negamax uses a single recursive function and negates the score when switching turns.

### Alpha-Beta Pruning

The implementation includes alpha-beta pruning optimization, which eliminates branches that cannot influence the final decision, significantly improving performance.

### Difficulty Levels

Difficulty is controlled by search depth:

| Opponent | Difficulty | Depth |
| -------- | ---------- | ----- |
| Hermes   | Easy       | 1     |
| Zeus     | Medium     | 3     |
| Athena   | Hard       | 9     |

Higher depth means the AI looks further ahead, resulting in stronger play. At depth 9 (Athena), the AI plays perfectly and cannot be beaten.

---

## Project Structure

```
tic-tac-toe v2/
├── app.py          # Flask web server
├── ai.py           # Negamax AI implementation
├── game.py         # Game logic and state management
├── constants.py    # Game constants
├── cli.py          # Command line interface
├── templates/
│   └── index.html  # Web UI template
├── static/
│   ├── style.css   # Styling with mythical theme
│   ├── script.js   # Frontend game logic
│   └── background.png
└── requirements.txt
```

---

## Requirements

- Python 3.7+
- Flask 2.0+

---

## Author

**Adeshina Abdulmuiz** - [SynDr0m3](https://github.com/SynDr0m3)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
