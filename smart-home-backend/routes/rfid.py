# smart-home-backend/routes/rfid.py
from flask import Blueprint, request, jsonify
# Import fungsi baru dari rfid_service
from services.rfid_service import authenticate_rfid, add_valid_rfid, remove_valid_rfid, get_all_valid_rfids
from flask_jwt_extended import jwt_required # Pastikan ini diimpor jika belum

rfid_bp = Blueprint('rfid', __name__)

@rfid_bp.route('/rfid/authenticate', methods=['POST'])
# Endpoint ini mungkin tidak memerlukan JWT jika dipanggil oleh ESP8266,
# tetapi jika dipanggil dari UI admin untuk tes, mungkin perlu. Sesuaikan keamanannya.
# @jwt_required() 
def authenticate():
    data = request.get_json()
    if not data or "rfid_id" not in data:
        return jsonify({"error": "Missing rfid_id in request body"}), 400

    rfid_id_scanned = data.get("rfid_id")

    if authenticate_rfid(rfid_id_scanned):
        # Logika untuk membuka pintu via MQTT atau langsung
        # Misalnya, jika pintu dikontrol sebagai 'device' lain via MQTT:
        # from mqtt_service import publish_control
        # publish_control("door_lock_1", "OPEN") # Atau "UNLOCK"
        print(f"RFID Route: Access granted for {rfid_id_scanned}, door should open.")
        return jsonify({"message": "Access granted, door opened."}), 200
    else:
        print(f"RFID Route: Access denied for {rfid_id_scanned}.")
        return jsonify({'message': 'Access denied.'}), 403

@rfid_bp.route('/rfid/valid_ids', methods=['GET'])
@jwt_required() # Lindungi endpoint ini
def get_valid_rfid_list():
    valid_ids = get_all_valid_rfids()
    return jsonify(valid_ids), 200

@rfid_bp.route('/rfid/valid_ids', methods=['POST'])
@jwt_required() # Lindungi endpoint ini
def add_new_valid_rfid():
    data = request.get_json()
    if not data or "rfid_id" not in data:
        return jsonify({"error": "Missing rfid_id in request body"}), 400

    rfid_id_to_add = data.get("rfid_id")
    user_assigned = data.get("user_assigned") # Opsional

    if not rfid_id_to_add:
         return jsonify({"error": "rfid_id cannot be empty"}), 400

    if add_valid_rfid(rfid_id_to_add, user_assigned):
        return jsonify({"message": f"RFID ID {rfid_id_to_add} added successfully."}), 201
    else:
        return jsonify({"error": f"RFID ID {rfid_id_to_add} already exists or failed to add."}), 409 # 409 Conflict

@rfid_bp.route('/rfid/valid_ids/<rfid_id_to_delete>', methods=['DELETE'])
@jwt_required() # Lindungi endpoint ini
def remove_existing_valid_rfid(rfid_id_to_delete):
    if remove_valid_rfid(rfid_id_to_delete):
        return jsonify({"message": f"RFID ID {rfid_id_to_delete} deleted successfully."}), 200
    else:
        return jsonify({"error": f"RFID ID {rfid_id_to_delete} not found or failed to delete."}), 404