"""
Game rules and board evaluation logic.
"""

from typing import List
from constants import WIN_LINES, EMPTY, PLAYER_X


def evaluate(board: List[int], player: int) -> int:
    """
    Evaluates the board from the perspective of `player`.

    Returns:
        1  -> player wins
       -1  -> player loses
        0  -> draw or non-terminal
    """
    for a, b, c in WIN_LINES:
        total = board[a] + board[b] + board[c]
        if total == 3 * player:
            return 1
        if total == -3 * player:
            return -1
    return 0


def is_terminal(board: List[int]) -> bool:
    """
    Checks whether the game has ended (win or draw).
    """
    return evaluate(board, PLAYER_X) != 0 or all(cell != EMPTY for cell in board)
