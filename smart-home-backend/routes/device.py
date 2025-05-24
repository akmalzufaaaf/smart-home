from flask import Blueprint, request, jsonify
from services.device_service import toggle_device # Akan dimodifikasi
from flask_jwt_extended import jwt_required
from mqtt_service import publish_control

device_bp = Blueprint('device', __name__)

@device_bp.route('/device/<device_id>/toggle', methods=['POST'])
@jwt_required()
def toggle(device_id):
    action = request.json.get('action') # action "on" or "off"
    
    if not action or action.lower() not in ["on", "off"]:
        return jsonify({'error': "Invalid action. Must be 'on' or 'off'."}), 400

    # toggle_device sekarang idealnya hanya mengurus logika di sisi backend/database
    # dan tidak langsung mem-publish ke MQTT. Publish dilakukan dari route.
    # Atau, toggle_device bisa menerima device_id juga.
    
    # Panggil publish_control dengan device_id dan action
    try:
        publish_control(device_id, action.upper()) # Kirim device_id dan action
        
        # Logika untuk mencatat aksi atau update database bisa tetap di toggle_device
        # atau dipindahkan sebagian ke sini jika perlu.
        # Untuk saat ini, asumsikan toggle_device mengurus logging internal.
        if toggle_device(device_id, action): # toggle_device mungkin perlu disesuaikan
            return jsonify({'message': f"Command to toggle device {device_id} to {action} sent."}), 200
        else:
            # Ini bisa terjadi jika device_id tidak valid menurut device_service
            return jsonify({'error': f"Failed to process toggle for device {device_id}."}), 400

    except Exception as e:
        print(f"Error publishing MQTT message: {e}")
        return jsonify({'error': "Failed to send command via MQTT."}), 500