from flask import Blueprint, jsonify
from services.log_service import get_logs

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/logs', methods=["GET"])
def get_all_logs():
    logs = get_logs()
    return jsonify(logs), 200
