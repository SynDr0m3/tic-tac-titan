"""
Flask web application for Tic-Tac-Toe.
"""

from flask import Flask, render_template, jsonify, request, session
from ai import best_move
from game import evaluate, is_terminal
from constants import PLAYER_X, PLAYER_O, EMPTY, DIFFICULTY_DEPTH

app = Flask(__name__)
app.secret_key = 'tic-tac-toe-secret-key-2026'

# AI Names mapped to difficulty
AI_NAMES = {
    "hermes": "easy",    # Easy
    "zeus": "medium",    # Medium
    "athena": "hard"     # Hard
}


def get_ai_display_name(ai_name):
    """Returns formatted display name for AI."""
    return ai_name.capitalize()


@app.route('/')
def index():
    """Render the main game page."""
    return render_template('index.html')


@app.route('/api/new-game', methods=['POST'])
def new_game():
    """Start a new game."""
    data = request.json
    mode = data.get('mode')  # 'pvp' or 'pva'
    player1_name = data.get('player1_name', 'Player 1')
    player2_name = data.get('player2_name', 'Player 2')
    ai_opponent = data.get('ai_opponent', 'zeus')  # hermes, zeus, athena
    delay_ai = data.get('delay_ai', False)
    
    # Initialize session
    session['board'] = [EMPTY] * 9
    session['mode'] = mode
    session['player1_name'] = player1_name
    session['player2_name'] = player2_name if mode == 'pvp' else get_ai_display_name(ai_opponent)
    session['ai_opponent'] = ai_opponent
    session['moves_history'] = []
    session['move_count'] = 0
    session['game_over'] = False
    session['winner'] = None
    
    # Score tracking - reset if coming from menu (reset_scores=true) or first game
    if 'scores' not in session or data.get('reset_scores'):
        session['scores'] = {'player1': 0, 'player2': 0, 'draws': 0}
    
    # Player 1 is ALWAYS X, Player 2 is ALWAYS O
    # But we alternate who makes the first move
    total_games = session['scores']['player1'] + session['scores']['player2'] + session['scores']['draws']
    player2_starts = (total_games % 2 == 1)
    session['player2_starts'] = player2_starts
    
    if player2_starts:
        # Player 2 (O) makes the first move
        session['current_player'] = PLAYER_O
        if mode == 'pva':
            if delay_ai:
                # Return immediately, AI will be triggered separately
                return jsonify({
                    'success': True,
                    'board': session['board'],
                    'current_player': 'O',
                    'player1_name': session['player1_name'],
                    'player2_name': session['player2_name'],
                    'scores': session['scores'],
                    'player2_starts': player2_starts,
                    'ai_pending': True
                })
            # AI goes first
            return make_ai_move_and_respond(is_new_game=True)
    else:
        # Player 1 (X) makes the first move (normal)
        session['current_player'] = PLAYER_X
    
    return jsonify({
        'success': True,
        'board': session['board'],
        'current_player': 'X' if session['current_player'] == PLAYER_X else 'O',
        'player1_name': session['player1_name'],
        'player2_name': session['player2_name'],
        'scores': session['scores'],
        'player2_starts': player2_starts
    })


@app.route('/api/make-move', methods=['POST'])
def make_move():
    """Handle a player's move."""
    if session.get('game_over'):
        return jsonify({'success': False, 'error': 'Game is over'})
    
    data = request.json
    position = data.get('position')
    
    board = session['board']
    current_player = session['current_player']
    
    # Validate move
    if position < 0 or position > 8 or board[position] != EMPTY:
        return jsonify({'success': False, 'error': 'Invalid move'})
    
    # Make the move
    board[position] = current_player
    session['board'] = board
    session['move_count'] += 1
    
    # Record move in history (Player 1 = X, Player 2 = O always)
    player_symbol = 'X' if current_player == PLAYER_X else 'O'
    player_name = session['player1_name'] if current_player == PLAYER_X else session['player2_name']
    
    session['moves_history'] = session.get('moves_history', []) + [{
        'player': player_name,
        'symbol': player_symbol,
        'position': position,
        'move_number': session['move_count']
    }]
    
    # Check for game end
    result = check_game_end(board)
    print(f"Game end check result: {result}")  # Debug
    if result['game_over']:
        session['game_over'] = True
        session['winner'] = result['winner']
        update_scores(result['winner'])
        return jsonify({
            'success': True,
            'board': board,
            'game_over': True,
            'winner': result['winner'],
            'winner_name': result['winner_name'],
            'scores': session['scores'],
            'moves_history': session['moves_history'],
            'move_count': session['move_count']
        })
    
    # Switch player
    session['current_player'] = -current_player
    
    # If playing against AI, check if we should delay AI response
    if session['mode'] == 'pva':
        delay_ai = data.get('delay_ai', False)
        if delay_ai:
            # Return human move only, AI will be triggered separately
            return jsonify({
                'success': True,
                'board': board,
                'current_player': 'X' if session['current_player'] == PLAYER_X else 'O',
                'game_over': False,
                'moves_history': session['moves_history'],
                'move_count': session['move_count'],
                'ai_pending': True
            })
        return make_ai_move_and_respond()
    
    return jsonify({
        'success': True,
        'board': board,
        'current_player': 'X' if session['current_player'] == PLAYER_X else 'O',
        'game_over': False,
        'moves_history': session['moves_history'],
        'move_count': session['move_count']
    })


@app.route('/api/ai-move', methods=['POST'])
def ai_move():
    """Make AI move (called separately when delay is needed)."""
    if session.get('game_over'):
        return jsonify({'success': False, 'error': 'Game is over'})
    
    if session['mode'] != 'pva':
        return jsonify({'success': False, 'error': 'Not in AI mode'})
    
    return make_ai_move_and_respond()


def make_ai_move_and_respond(is_new_game=False):
    """Make AI move and return response."""
    board = session['board']
    ai_player = session['current_player']
    ai_opponent = session.get('ai_opponent', 'zeus')
    difficulty = AI_NAMES.get(ai_opponent, 'medium')
    depth = DIFFICULTY_DEPTH[difficulty]
    
    # Get AI move
    position = best_move(board, ai_player, depth)
    
    if position is not None:
        board[position] = ai_player
        session['board'] = board
        session['move_count'] += 1
        
        # Record AI move (AI is always Player 2 = O, unless AI starts first then it's O too)
        player_symbol = 'X' if ai_player == PLAYER_X else 'O'
        player_name = session['player1_name'] if ai_player == PLAYER_X else session['player2_name']
        session['moves_history'] = session.get('moves_history', []) + [{
            'player': player_name,
            'symbol': player_symbol,
            'position': position,
            'move_number': session['move_count']
        }]
    
    # Check for game end
    result = check_game_end(board)
    if result['game_over']:
        session['game_over'] = True
        session['winner'] = result['winner']
        update_scores(result['winner'])
        return jsonify({
            'success': True,
            'board': board,
            'game_over': True,
            'winner': result['winner'],
            'winner_name': result['winner_name'],
            'scores': session['scores'],
            'moves_history': session['moves_history'],
            'move_count': session['move_count'],
            'ai_move': position
        })
    
    # Switch back to human
    session['current_player'] = -ai_player
    
    return jsonify({
        'success': True,
        'board': board,
        'current_player': 'X' if session['current_player'] == PLAYER_X else 'O',
        'game_over': False,
        'moves_history': session['moves_history'],
        'move_count': session['move_count'],
        'ai_move': position,
        'scores': session['scores'],
        'player1_name': session['player1_name'],
        'player2_name': session['player2_name'],
        'player2_starts': session.get('player2_starts', False)
    })


def check_game_end(board):
    """Check if the game has ended."""
    from constants import PLAYER_X, PLAYER_O, WIN_LINES
    
    # Debug: Print the board state
    print(f"Checking game end. Board: {board}")
    
    # Check each win line explicitly
    for i, (a, b, c) in enumerate(WIN_LINES):
        line = [board[a], board[b], board[c]]
        total = sum(line)
        print(f"  Line {i} ({a},{b},{c}): {line} = {total}")
        
        if total == 3:  # X wins (3 * 1 = 3)
            winner_name = session['player1_name']
            print(f"X wins on line {i}! winner=player1, winner_name={winner_name}")
            return {'game_over': True, 'winner': 'player1', 'winner_name': winner_name}
        
        if total == -3:  # O wins (3 * -1 = -3)
            winner_name = session['player2_name']
            print(f"O wins on line {i}! winner=player2, winner_name={winner_name}")
            return {'game_over': True, 'winner': 'player2', 'winner_name': winner_name}
    
    # Check for draw - board is full and no winner
    if all(cell != EMPTY for cell in board):
        print("Draw! Board is full with no winner.")
        return {'game_over': True, 'winner': 'draw', 'winner_name': None}
    
    print("Game continues...")
    return {'game_over': False, 'winner': None, 'winner_name': None}


def update_scores(winner):
    """Update the scores based on game result."""
    scores = session.get('scores', {'player1': 0, 'player2': 0, 'draws': 0})
    if winner == 'player1':
        scores['player1'] += 1
    elif winner == 'player2':
        scores['player2'] += 1
    else:
        scores['draws'] += 1
    session['scores'] = scores


@app.route('/api/get-state', methods=['GET'])
def get_state():
    """Get current game state."""
    return jsonify({
        'board': session.get('board', [EMPTY] * 9),
        'current_player': 'X' if session.get('current_player', PLAYER_X) == PLAYER_X else 'O',
        'player1_name': session.get('player1_name', 'Player 1'),
        'player2_name': session.get('player2_name', 'Player 2'),
        'scores': session.get('scores', {'player1': 0, 'player2': 0, 'draws': 0}),
        'moves_history': session.get('moves_history', []),
        'move_count': session.get('move_count', 0),
        'game_over': session.get('game_over', False),
        'winner': session.get('winner'),
        'x_is_player1': session.get('x_is_player1', True)
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
