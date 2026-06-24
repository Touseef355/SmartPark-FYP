import base64
import easyocr
import cv2
import os
import re
import json
import numpy as np
from ultralytics import YOLO


# Load EasyOCR reader once — reloading is slow
reader = easyocr.Reader(["en"], gpu=False)

# Load YOLO model once
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
yolo_model = YOLO(os.path.join(BASE_DIR,"runs/detect/plate_detector2/weights/best.pt"))

# Load Pakistani plate patterns
with open(os.path.join(BASE_DIR,'plate_pattern.json')) as f:
    patterns = json.load(f)


def is_valid_plate(text):
    """
    Validate detected text against Pakistani plate patterns
    Returns True if text matches any known pattern
    """
    for province, cities in patterns.items():
        for city, vehicles in cities.items():
            for vehicle in vehicles:
                if re.fullmatch(vehicle['regex'], text):
                    return True
    return False


def preprocess_plate(plate_img):
    """
    Enhance plate image for better OCR accuracy
    """
    # Resize 2x — larger image improves OCR
    plate_img = cv2.resize(plate_img, None, fx=2, fy=2,
                           interpolation=cv2.INTER_CUBIC)

    # Grayscale
    gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)

    # Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=10)

    # Sharpen — text edges clear
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    gray = cv2.filter2D(gray, -1, kernel)

    # Threshold — OTSU automatically finds best threshold
    gray = cv2.threshold(gray, 0, 255,
                         cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    return gray


def get_text_height(result):
    """
    Calculate height of detected text box
    Larger height = larger font size
    """
    coords = result[0]
    y_values = [point[1] for point in coords]
    height = max(y_values) - min(y_values)
    return height


def get_text_center_x(result, image_width):
    """
    Check if text is in the middle 60% of plate horizontally
    Filters out corner text like registration numbers
    """
    coords = result[0]
    x_values = [point[0] for point in coords]
    text_center = (min(x_values) + max(x_values)) / 2

    # Middle 60% of image
    left_limit = image_width * 0.20
    right_limit = image_width * 0.80

    return left_limit <= text_center <= right_limit


def normalize_plate(text):
    """
    Clean detected text — keep only letters, numbers and spaces
    """
    # Remove anything that is not A-Z, 0-9 or space
    text = re.sub(r'[^A-Z0-9 ]', '', text)
    # Remove extra spaces
    text = ' '.join(text.split())
    return text


def clean_plate_text(texts):
    """
    Remove province names, city names and extra words
    Pakistani plates have extra text like PUNJAB, ISLAMABAD etc.
    """
    ignore_words = [
        # Province names
        'PUNJAB', 'SINDH', 'KPK',
        'BALOCHISTAN', 'ISLAMABAD',
        'ICT', 'KARACHI', 'LAHORE',
        'PAKISTAN', 'AJK', 'GB',
        # City names
        'MULTAN', 'GUJRAT', 'FAISALABAD',
        'PESHAWAR', 'QUETTA', 'RAWALPINDI',
        # Other words found on plates
        'PRIVATE', 'GOVT', 'GOVERNMENT',
        'POLICE', 'ARMY', 'NAVY', 'PAF',
    ]

    cleaned = []
    for text in texts:
        if text not in ignore_words:
            if re.search(r'[A-Z0-9]', text):
                cleaned.append(text)

    return cleaned


def sort_plate_text(texts):
    """
    Sort plate text — letters first, numbers second
    Pakistani plates format: Letters + Numbers
    Example: "LEB 4524" not "4524 LEB"
    """
    letters = []
    numbers = []

    for text in texts:
        # More letters → letter part
        if any(c.isalpha() for c in text):
            letters.append(text)
        else:
            numbers.append(text)

    # Letters first + numbers second
    return letters + numbers


def detect_plate(image_path):
    """
    Main function — detect and read number plate from image
    Step 1: YOLO locates the plate in image
    Step 2: Preprocess cropped plate
    Step 3: EasyOCR reads all text
    Step 4: Filter by font size and position
    Step 5: Sort and clean text
    Step 6: Validate against Pakistani patterns
    """
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        return {"success": False, "error": "Image not found"}

    # Step 1 — YOLO: locate plate in image
    yolo_results = yolo_model(image, conf=0.5)

    # No plate found
    if len(yolo_results[0].boxes) == 0:
        return {"success": False, "error": "No plate detected by YOLO"}

    # Get the most confident plate box
    boxes = yolo_results[0].boxes
    box = max(boxes,key=lambda b:float(b.conf[0]))

    # Get box coordinates
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    pad = 5
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(image.shape[1], x2 + pad)
    y2 = min(image.shape[0], y2 + pad)
    yolo_confidence = float(box.conf[0])

    # Step 2 — Crop plate from image
    plate_img = image[y1:y2, x1:x2]

    # Step 3 — Preprocess plate image
    gray = preprocess_plate(plate_img)

    # Step 4 — EasyOCR: read all text from plate
    results = reader.readtext(
        gray,
        allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        detail=1
    )

    if not results:
        return {"success": False, "error": "No text detected"}

    # Step 5 — Filter by font size and center position
    image_width = gray.shape[1]

    # Calculate height of each detected text
    results_with_height = [
        (r, get_text_height(r)) for r in results
    ]

    # Sort by height — largest font first
    results_with_height.sort(key=lambda x: x[1], reverse=True)

    # Average height of all texts
    avg_height = sum(h for _, h in results_with_height) / len(results_with_height)

    # Keep texts that are large font + center position + high confidence
    filtered_results = [
        r for r, h in results_with_height
        if h >= avg_height * 0.8
        and get_text_center_x(r, image_width)
        and r[2] >= 0.4
    ]

    # Fallback — if nothing passed filter use all results
    if not filtered_results:
        filtered_results = [r for r in results if r[2] >= 0.4]

    # Sort left to right — correct reading order
    filtered_results.sort(key=lambda r: r[0][0][0])

    # Extract text
    high_confidence = [
        r[1].upper().strip()
        for r in filtered_results
    ]

    if not high_confidence:
        return {"success": False, "error": "Low confidence text"}

    # Remove province names and extra words
    filtered_text = clean_plate_text(high_confidence)

    if not filtered_text:
        return {"success": False, "error": "Only ignored words detected"}

    # Sort — letters first, numbers second
    filtered_text = sort_plate_text(filtered_text)

    # Join and normalize
    combined = normalize_plate(" ".join(filtered_text))

    print(f"YOLO confidence: {yolo_confidence:.2f}")
    print(f"Detected text: {combined}")

    # Calculate average OCR confidence
    conf_values = [r[2] for r in filtered_results]
    ocr_conf = round(sum(conf_values) / len(conf_values), 2) if conf_values else 0.5
    # Cropped plate → base64 encode
    _, buffer = cv2.imencode('.jpg', plate_img)
    cropped_base64 = base64.b64encode(buffer).decode('utf-8')
    # Validate against Pakistani plate patterns
    if is_valid_plate(combined):

        return {
            "success": True,
            "plate_number": combined,
            "yolo_confidence": round(yolo_confidence, 2),
            "ocr_confidence": ocr_conf,
            "cropped_plate" : cropped_base64,
        }
    

    # Pattern not matched — still return result
    return {
        "success": True,
        "plate_number": combined,
        "yolo_confidence": round(yolo_confidence, 2),
        "ocr_confidence": ocr_conf,
        "cropped_plate" : cropped_base64,
        "note": "Pattern not in database"
    }