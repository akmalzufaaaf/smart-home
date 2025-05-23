from flask import Blueprint, request, jsonify
from services.rfid_service import authenticate_rfid

rfid_bp = Blueprint('rfid', __name__)

@rfid_bp.route('/rfid/authenticate', methods=['POST'])
def authenticate():
    rfid_id = request.json.get("rfid_id")
    if authenticate_rfid(rfid_id):
        return jsonify({"message": "Access granted, door opened."}), 200
    else:
        return jsonify({'message': 'Access denied.'}), 403