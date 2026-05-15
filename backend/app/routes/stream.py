from flask import Blueprint, jsonify
from flask_socketio import emit
from app import socketio
from app.services.stream_generator import get_generator

stream_bp = Blueprint('stream', __name__)

@socketio.on('connect')
def on_connect():
    print('[ws] client connected')
    gen = get_generator(socketio)
    gen.start()
    emit('status', {'connected': True, 'message': 'Stream started'})

@socketio.on('disconnect')
def on_disconnect():
    print('[ws] client disconnected')

@stream_bp.route('/stream/status', methods=['GET'])
def stream_status():
    gen = get_generator(socketio)
    return jsonify({'running': gen.running})