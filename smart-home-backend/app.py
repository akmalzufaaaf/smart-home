from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, create_refresh_token
from werkzeug.security import generate_password_hash, check_password_hash # Untuk hashing password
from config import Config
from flask_cors import CORS

from routes.device import device_bp
from routes.rfid import rfid_bp
from routes.logs import logs_bp
from mqtt_service import init_mqtt
from services.device_service import update_device_status_from_mqtt, get_all_devices_status, register_new_device # Impor fungsi baru
from database import Database # Impor Database

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)
jwt = JWTManager(app)

# Fungsi untuk membuat user baru (bisa dijadikan endpoint terpisah jika perlu)
def create_user_if_not_exists(username, password_plain):
    db = Database()
    if not db.users_collection.find_one({"username": username}):
        hashed_password = generate_password_hash(password_plain)
        db.users_collection.insert_one({"username": username, "password": hashed_password})
        print(f"User {username} created.")
    else:
        print(f"User {username} already exists.")

# Panggil create_user_if_not_exists saat aplikasi start untuk user admin default
with app.app_context():
    create_user_if_not_exists("admin", "adminpassword") # Ganti password ini!

init_mqtt(app_db_updater=update_device_status_from_mqtt)

@app.route("/login", methods=["POST"])
def login():
    db = Database()
    username = request.json.get("username", None)
    password = request.json.get("password", None)

    user = db.users_collection.find_one({"username": username})

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"msg": "Invalid credentials"}), 401
    
    access_token = create_access_token(identity=username)
    refresh_token = create_refresh_token(identity=username)
    return jsonify(access_token=access_token, refresh_token=refresh_token), 200

# Endpoint baru untuk mendapatkan status semua perangkat
@app.route("/api/devices", methods=["GET"])
@jwt_required()
def get_devices():
    devices_status = get_all_devices_status()
    return jsonify(devices_status), 200

# Endpoint contoh untuk mendaftarkan device baru (bisa diamankan lebih lanjut)
@app.route("/api/device/register", methods=["POST"])
@jwt_required() # Mungkin hanya admin yang boleh
def register_device_endpoint():
    data = request.json
    device_id = data.get("device_id")
    name = data.get("name")
    device_type = data.get("type") # misal "relay", "sensor"
    
    if not all([device_id, name, device_type]):
        return jsonify({"error": "Missing device_id, name, or type"}), 400
        
    if register_new_device(device_id, name, device_type):
        return jsonify({"message": f"Device {device_id} registered successfully."}), 201
    else:
        return jsonify({"error": f"Device {device_id} already exists or failed to register."}), 409

# endpoint untuk mendapatkan refresh token
@app.route("/refresh", methods=['POST'])
@jwt_required(fresh=True)
def refresh():
    #membuat refresh token baru
    current_user = get_jwt_identity()
    refresh_token = create_refresh_token(identity=current_user)
    return jsonify(refresh_token=refresh_token), 200

# endpoint yang membutuhkan jwt token
@app.route("/protected", methods=['GET'])
@jwt_required()
def protected():
    # mengambil data pengguna dari token
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user), 200

# Endpoint untuk memulai server Flask
@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({"message": "Backend is listening to MQTT topic."}), 200

# register blueprints
app.register_blueprint(device_bp, url_prefix='/api') #need jwt
app.register_blueprint(rfid_bp, url_prefix='/api')
app.register_blueprint(logs_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0') # host='0.0.0.0' agar bisa diakses dari luar kontainer jika perlu (untuk dev)
