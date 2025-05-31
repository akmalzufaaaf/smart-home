# smart-home-backend/routes/users.py
from flask import Blueprint, jsonify
from services.user_service import get_all_users
from flask_jwt_extended import jwt_required

users_bp = Blueprint('users', __name__)

@users_bp.route('/users', methods=['GET'])
@jwt_required() # Lindungi endpoint ini, mungkin hanya admin yang boleh lihat
def get_users_list():
    users = get_all_users()
    return jsonify(users), 200