# smart-home-backend/routes/device.py
from flask import Blueprint, request, jsonify
from services.device_service import toggle_device, get_device_status # Pastikan ini diimpor
from flask_jwt_extended import jwt_required
from mqtt_service import publish_control, publish_status # IMPORT publish_status

device_bp = Blueprint('device', __name__)

@device_bp.route('/device/<device_id>/toggle', methods=['POST'])
@jwt_required()
def toggle(device_id):
    action = request.json.get('action')
    
    if not action or action.lower().strip() not in ["on", "off"]: # Tambahkan strip()
        return jsonify({'error': "Invalid action. Must be 'on' or 'off'."}), 400

    processed_action = action.lower().strip()

    try:
        print(f"API: Received toggle request for device '{device_id}' to action '{processed_action}'")
        # 1. Ubah status di database
        if toggle_device(device_id, processed_action): 
            
            # 2. Kirim perintah kontrol ke perangkat keras (jika ini tujuannya)
            # Jika Anda hanya ingin backend mengontrol status dan perangkat keras hanya melaporkan,
            # baris publish_control ini mungkin tidak selalu diperlukan jika backend adalah sumber kebenaran utama.
            # Namun, untuk sistem smarthome, biasanya perintah dikirim ke perangkat.
            publish_control(device_id, processed_action.upper())
            
            # 3. Dapatkan status terbaru dari DB (setelah diubah oleh toggle_device)
            current_status_in_db = get_device_status(device_id)
            
            final_status_to_publish = processed_action.upper() # Default ke action yang diminta
            if current_status_in_db and current_status_in_db != "UNKNOWN":
                final_status_to_publish = current_status_in_db.upper()
            
            # 4. Publish status terbaru ke topik yang didengarkan frontend (DAN SEMUA SUBSCRIBER LAIN)
            publish_status(device_id, final_status_to_publish)
            print(f"API: Successfully processed toggle for '{device_id}', published status '{final_status_to_publish}'.")
            
            return jsonify({'message': f"Command for device {device_id} to '{processed_action}' sent, status published as '{final_status_to_publish}'."}), 200
        else:
            # toggle_device mengembalikan False jika device tidak ditemukan atau gagal update
            print(f"API: Failed to process toggle for device '{device_id}' in service.")
            return jsonify({'error': f"Failed to process toggle for device {device_id}."}), 404 # 404 jika device tidak ada

    except Exception as e:
        print(f"API: Error in toggle endpoint for {device_id}: {e}")
        return jsonify({'error': "Internal server error during toggle operation."}), 500

# Endpoint lain seperti register, delete device, dll.
# Pastikan mereka juga memanggil publish_status jika status perangkat berubah
# atau jika perangkat baru ditambahkan/dihapus (mungkin dengan payload khusus atau cukup refresh list di frontend)