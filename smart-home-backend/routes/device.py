# routes/device.py
from flask import Blueprint, request, jsonify
# Import fungsi get_device_status dari device_service
from services.device_service import toggle_device, get_device_status 
# Import publish_status DARI mqtt_service
from flask_jwt_extended import jwt_required
from mqtt_service import publish_control, publish_status # TAMBAHKAN publish_status

device_bp = Blueprint('device', __name__)

@device_bp.route('/device/<device_id>/toggle', methods=['POST'])
@jwt_required()
def toggle(device_id):
    action = request.json.get('action') 
    
    if not action or action.lower() not in ["on", "off"]:
        return jsonify({'error': "Invalid action. Must be 'on' or 'off'."}), 400

    try:
        # 1. Ubah status di database & catat log (jika toggle_device melakukan ini)
        # Pastikan toggle_device mengembalikan status baru atau True jika berhasil
        if toggle_device(device_id, action.lower()): # toggle_device akan mengubah status di DB
            
            # 2. Kirim perintah kontrol ke perangkat keras (jika perlu)
            publish_control(device_id, action.upper())
            
            # 3. Dapatkan status terbaru dari DB setelah diubah oleh toggle_device
            # Atau, jika toggle_device mengembalikan status baru, gunakan itu.
            # Untuk konsistensi, kita ambil dari DB.
            current_status_from_db = get_device_status(device_id) # Anda perlu memastikan fungsi ini ada dan benar di device_service.py
            
            final_status_to_publish = action.upper() # Default ke action yang diminta
            if current_status_from_db and current_status_from_db != "UNKNOWN":
                final_status_to_publish = current_status_from_db.upper()
            
            # 4. Publish status terbaru/yang diminta ke topik yang didengarkan frontend
            publish_status(device_id, final_status_to_publish)
            print(f"API toggle: Published status '{final_status_to_publish}' for device '{device_id}' to MQTT status topic.")
            
            return jsonify({'message': f"Device {device_id} command sent, status published as {final_status_to_publish}."}), 200
        else:
            # Ini bisa terjadi jika device_id tidak valid menurut device_service atau toggle gagal
            return jsonify({'error': f"Failed to process toggle for device {device_id} in database."}), 400

    except Exception as e:
        print(f"Error in toggle endpoint for {device_id}: {e}")
        return jsonify({'error': "Failed to send command or publish status via MQTT."}), 500