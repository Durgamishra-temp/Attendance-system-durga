from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import json
import os

app = Flask(__name__, static_folder='.')
CORS(app)

STUDENTS = [
    "Abhishek Prasad Mallick", "Aju Kumar", "Akambari Halwa", "Alok Ray",
    "Asish Kumar Behera", "Atanu Talukdar", "Barsha Rani Nayak", "Bhagaban Mishra",
    "Bijay Behera", "Budri Pangi", "Ch. Ankita", "Chandan Sahu",
    "Chinnari Sai Saravan", "Dakoji Sneha Acharya", "Dandu Abhinaya Verma",
    "Deepak Burman", "Dharani Senapati", "Durga Prasad Mishra", "Gourav Jena",
    "Gourish Biswas", "Harshbardhan Deo", "Likita", "Jyoti Ratnalu",
    "Jyotir Mayee Mishra", "Kiran Nilagiri", "Kiran Sukri", "Yesaswini",
    "Lipun Kumar", "Madhusmita Bakchi", "Munna Chando", "Nutan Labala",
    "Gayatri", "Papu Bag", "Harika", "Peddapati Gayatri",
    "Piniti Vaishnavi", "Pokhraj Sharma", "Prabhakar Kar", "Pradip Khila",
    "Punam Behera", "Rachana Sardar", "Rajindra Gond", "Rohit Biswas",
    "Sakshi Singh", "Sibani Sahu", "Sudhakar Bidika", "Subham Setadi",
    "Supriya Sethi", "Suryakant Nayak", "T Devi Sri Sai Charan",
    "Tanmay Padiyami", "Tejeswar Panda", "V. Laxmi Aparna"
]

ATTENDANCE_FILE = os.path.join(os.path.dirname(__file__), "attendance_data.json")

def load_attendance():
    if os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_attendance(data):
    with open(ATTENDANCE_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(".", path)

@app.route("/api/students", methods=["GET"])
def get_students():
    return jsonify({"students": STUDENTS, "total": len(STUDENTS)})

@app.route("/api/attendance", methods=["GET"])
def get_attendance():
    date = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    data = load_attendance()
    return jsonify({"date": date, "attendance": data.get(date, {})})

@app.route("/api/attendance", methods=["POST"])
def mark_attendance():
    data = request.json
    date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    attendance = data.get("attendance", {})
    
    all_data = load_attendance()
    all_data[date] = attendance
    save_attendance(all_data)
    
    return jsonify({"status": "success", "message": "Attendance saved successfully"})

@app.route("/api/attendance/history", methods=["GET"])
def get_history():
    data = load_attendance()
    return jsonify({"history": data})

@app.route("/api/attendance/history", methods=["DELETE"])
def clear_history():
    date = request.args.get("date")
    all_data = load_attendance()
    
    if date:
        if date in all_data:
            del all_data[date]
            save_attendance(all_data)
            return jsonify({"status": "success", "message": f"Attendance for {date} cleared"})
        else:
            return jsonify({"status": "error", "message": f"No record found for {date}"}), 404
    else:
        save_attendance({})
        return jsonify({"status": "success", "message": "All attendance history cleared"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

