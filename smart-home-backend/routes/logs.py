from flask import Blueprint, jsonify
from services.log_service import get_logs
from flask_jwt_extended import jwt_required # Pastikan ini diimpor jika belum

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/logs', methods=["GET"])
def get_all_logs():
    logs = get_logs()
    return jsonify(logs), 200

from services.log_service import get_rfid_logs # Import fungsi baru

@logs_bp.route('/logs/rfid', methods=['GET'])
@jwt_required()
def get_rfid_logs_endpoint():
    logs = get_rfid_logs()
    return jsonify(logs), 200