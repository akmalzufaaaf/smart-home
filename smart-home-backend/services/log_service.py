from database import Database

def get_logs():
    db = Database()
    logs = db.logs_collection.find()
    
    # konversi setiap objectid menjadi string
    logs_list = []
    for log in logs:
        log["_id"] = str(log["_id"]) #mongonversi setiap objectid menjadi string
        logs_list.append(log)

    return logs_list # convert cursor to list of logs