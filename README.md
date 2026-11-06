# SmartPark — AI-Powered Smart Parking Management System

An AI-powered parking management system that automates vehicle entry and exit with computer vision, reads number plates, and predicts peak-hour parking occupancy.

**Final Year Project — BS Information Technology, University of Gujrat (UOG), Pakistan**

## What it does

SmartPark replaces manual parking registration with an automated pipeline:

1. A camera captures a vehicle at entry or exit.
2. **YOLOv8** detects the vehicle and its number plate.
3. **EasyOCR** reads the plate text.
4. The plate is validated against a plate pattern and linked to a parking record.
5. **Random Forest** predicts peak-hour parking occupancy, so managers can see when demand will be highest.
6. Staff manage everything through role-based dashboards — **Administrator, Parking Manager, and Cashier** — on web and mobile.

## Tech stack

| Layer | Technology |
|---|---|
| AI / Computer Vision | Python, YOLOv8, OpenCV, EasyOCR, Scikit-learn (Random Forest) |
| Backend | Python, Django REST Framework |
| Database | Supabase / PostgreSQL |
| Web dashboard | React, Vite, JavaScript, Recharts |
| Mobile app | Flutter, Dart |
| Other | REST APIs, Git, Nginx |

## AI module

The AI pipeline lives in `ai_module/`:

- `detector.py` — YOLOv8 vehicle and number-plate detection
- `entry_camera.py` — entry-camera processing
- `exit_camera.py` — exit-camera processing
- `image_preprocessing.py` — image preprocessing
- `plate_pattern.json` — number-plate pattern validation
- `train.py` — model training utilities
- `test_detector.py` — detection testing
- `yolov8n.pt` — YOLOv8 nano weights

## Repository structure

```
SmartPark-FYP/
├── ai_module/          # AI and computer vision components
├── backend/            # Django backend and APIs
│   ├── accounts/
│   ├── ai_module/
│   ├── bookings/
│   ├── notifications/
│   ├── parking/
│   ├── payments/
│   └── sps_backend/
├── docs/               # Project documentation
├── landing-page/       # Public landing page
├── mobile_app/         # Mobile application resources
├── parking-dashboard/  # React / Vite parking dashboard
├── parkroo_app/        # Flutter application
├── requirements.txt    # Python dependencies
└── README.md
```

## How it works

```
Vehicle arrives
    ↓
Entry camera
    ↓
Image processing (OpenCV)
    ↓
YOLOv8 vehicle and plate detection
    ↓
EasyOCR plate text recognition
    ↓
Plate validation and vehicle identification
    ↓
Parking record created or updated
    ↓
Dashboard and mobile app show live status
```

The exit camera follows the same pipeline and closes the parking record. Bookings, payments, and notifications are handled by the Django backend modules.

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/Touseef355/SmartPark-FYP.git
cd SmartPark-FYP
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000/` by default.

### 3. AI module setup

```bash
cd ai_module
python test_detector.py
```

Train with:

```bash
python train.py
```

Training requirements depend on the dataset, hardware, and configuration used.

### 4. Parking dashboard setup

```bash
cd parking-dashboard
npm install
npm run dev
```

### 5. Mobile app

```bash
cd parkroo_app
flutter pub get
flutter run
```

Flutter and the Android/iOS development environment must be installed first.

## Environment variables

Never commit secrets to Git. Provide them through environment variables or a local `.env` file, and keep `.env` in `.gitignore`:

```
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_URL=your_database_url
```

Never publish passwords, API keys, database credentials, authentication tokens, or production secrets.

## Testing

```bash
# AI module
python test_detector.py

# Backend
python manage.py test
```

## Future improvements

- Real-time parking-space detection
- Stronger plate recognition and OCR
- Live parking availability and intelligent recommendations
- Advanced analytics, reporting, and peak-hour prediction
- Cloud deployment and WebSocket-based real-time updates
- Automated gate integration
- Production-grade authentication and authorization
- AI model optimisation for edge devices

## Author

**Touseef Ahmed** — BS Information Technology, University of Gujrat

- GitHub: https://github.com/Touseef355
- LinkedIn: https://www.linkedin.com/in/touseefahmed-

This project was developed as a Final Year Project, for academic and educational purposes.
