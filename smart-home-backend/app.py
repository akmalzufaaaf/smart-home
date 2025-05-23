from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, create_refresh_token
from config  import Config
from flask_cors import CORS  # Import CORS

#import blueprint
from routes.device import device_bp
from routes.rfid import rfid_bp
from routes.logs import logs_bp

# import mqtt init dan publish
from mqtt_service import init_mqtt

app = Flask(__name__)

# mengaktifkan CORS untuk semua origin
CORS(app)

app.config.from_object(Config)

# inisialisasi JWT
jwt = JWTManager(app)

# Dummy user database (ganti dengan database nyata)
users = {
    "admin": {"password": "adminpassword"},
}

# insialisasi mqtt sebelum app.run
init_mqtt()

# endpoint untuk login dan mendapatkan JWT token
@app.route("/login", methods=["POST"])
def login():
    username = request.json.get("username", None)
    password = request.json.get("password", None)

    if username not in users or users[username]['password'] != password:
        return jsonify({"msg": "Invalid credentials"}), 401
    
    # Buat access token untuk pengguna yang berhasil login
    access_token = create_access_token(identity=username)
    refresh_token = create_refresh_token(identity=username)
    return jsonify(access_token=access_token, refresh_token=refresh_token), 200

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
    app.run(debug=True)