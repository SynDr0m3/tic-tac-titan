"""
Command-line interface for playing Tic-Tac-Toe.
"""

from constants import PLAYER_X, PLAYER_O, EMPTY, DIFFICULTY_DEPTH
from ai import best_move
from game import is_terminal, evaluate


def print_board(board):
    symbols = {PLAYER_X: "X", PLAYER_O: "O", EMPTY: " "}
    for i in range(0, 9, 3):
        print(f" {symbols[board[i]]} | {symbols[board[i+1]]} | {symbols[board[i+2]]} ")
        if i < 6:
            print("---+---+---")
    print()


def get_player_symbol(player):
    """Returns the symbol for the given player."""
    return "X" if player == PLAYER_X else "O"


def human_turn(board, player):
    """Handles a human player's turn."""
    symbol = get_player_symbol(player)
    while True:
        try:
            move = int(input(f"Player {symbol}, choose position (0-8): "))
            if 0 <= move <= 8 and board[move] == EMPTY:
                board[move] = player
                break
        except ValueError:
            pass
        print("Invalid move.")


def ai_turn(board, player, difficulty):
    """Handles the AI's turn."""
    depth = DIFFICULTY_DEPTH[difficulty]
    move = best_move(board, player, depth)
    if move is None:
        return  # No valid moves available
    board[move] = player
    print(f"AI plays at position {move}")


def get_valid_mode():
    """Prompts user for a valid game mode."""
    print("\nGame Modes:")
    print("  1: Human vs Human")
    print("  2: Human vs AI")
    while True:
        mode = input("Choose mode (1 or 2): ").strip()
        if mode in ("1", "2"):
            return mode
        print("Invalid mode. Please enter 1 or 2.")


def get_valid_difficulty():
    """Prompts user for a valid difficulty level."""
    valid_difficulties = list(DIFFICULTY_DEPTH.keys())
    while True:
        difficulty = input("Difficulty (easy / medium / hard): ").lower().strip()
        if difficulty in valid_difficulties:
            return difficulty
        print(f"Invalid difficulty. Please choose from: {', '.join(valid_difficulties)}")


def main():
    board = [EMPTY] * 9
    current_player = PLAYER_X

    mode = get_valid_mode()
    
    difficulty = None
    if mode == "2":
        difficulty = get_valid_difficulty()

    print()
    print_board(board)

    while not is_terminal(board):
        if mode == "1":
            # Human vs Human
            human_turn(board, current_player)
        else:
            # Human vs AI
            if current_player == PLAYER_X:
                human_turn(board, current_player)
            else:
                ai_turn(board, PLAYER_O, difficulty)

        print_board(board)
        current_player *= -1

    result = evaluate(board, PLAYER_X)
    print("X wins!" if result == 1 else "O wins!" if result == -1 else "Draw!")


if __name__ == "__main__":
    main()
