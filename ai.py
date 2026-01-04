"""
Negamax AI implementation with alpha-beta pruning.
"""

from typing import List, Optional
from game import evaluate
from constants import EMPTY


def negamax(board: List[int], player: int, depth: int, alpha: float = -float("inf"), beta: float = float("inf")) -> int:
    """
    Negamax algorithm with alpha-beta pruning and depth limitation.

    Args:
        board: Current board state
        player: Current player (+1 or -1)
        depth: Search depth limit
        alpha: Best score the maximizing player can guarantee
        beta: Best score the minimizing player can guarantee

    Returns:
        Best score from current player's perspective
    """
    score = evaluate(board, player)
    if score != 0 or depth == 0 or all(cell != EMPTY for cell in board):
        return score

    best = -float("inf")
    for i in range(9):
        if board[i] == EMPTY:
            board[i] = player
            value = -negamax(board, -player, depth - 1, -beta, -alpha)
            board[i] = EMPTY
            best = max(best, value)
            alpha = max(alpha, value)
            if alpha >= beta:
                break  # Beta cutoff
    return best


def best_move(board: List[int], player: int, depth: int) -> Optional[int]:
    """
    Determines the best move for the current player.
    """
    best_score = -float("inf")
    move = None
    alpha = -float("inf")
    beta = float("inf")

    for i in range(9):
        if board[i] == EMPTY:
            board[i] = player
            score = -negamax(board, -player, depth - 1, -beta, -alpha)
            board[i] = EMPTY

            if score > best_score:
                best_score = score
                move = i
            alpha = max(alpha, score)

    return move
