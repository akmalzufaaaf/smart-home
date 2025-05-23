from flask import Blueprint, request, jsonify
from services.device_service import toggle_device
from flask_jwt_extended import jwt_required
from mqtt_service import publish_control

device_bp = Blueprint('device', __name__)

@device_bp.route('/device/<device_id>/toggle', methods=['POST'])
@jwt_required()
def toggle(device_id):
    action = request.json.get('action') # action "on" or "off"
    if toggle_device(device_id, action):
        publish_control(action.upper())
        return jsonify({'message': f"Device {device_id} turned {action}."}), 200
    else:
        return jsonify({'error': "Invalid device or action."}), 400
        