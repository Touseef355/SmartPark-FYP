import cv2
import numpy as np
import matplotlib.pyplot as plt

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
    plt.imshow(gray,cmap="gray")
    plt.show()
preprocess_plate("D:/Smart-Parking-System/ai_module/images/licence_plate.png")