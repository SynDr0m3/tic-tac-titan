"""
Game constants and configuration.
"""

WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6)
]

EMPTY = 0
PLAYER_X = 1
PLAYER_O = -1

DIFFICULTY_DEPTH = {
    "easy": 1,
    "medium": 3,
    "hard": 9
}
