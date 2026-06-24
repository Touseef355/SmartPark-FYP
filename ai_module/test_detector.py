from detector import detect_plate

images=[
    "D:/Smart-Parking-System/ai_module/images/car-far.jpg",
    "D:/Smart-Parking-System/ai_module/images/car-close.jpg",
    "D:/Smart-Parking-System/ai_module/images/car1.jpg",
    "D:/Smart-Parking-System/ai_module/images/car2.jpg",
    "D:/Smart-Parking-System/ai_module/images/car4.jpg",
    "D:/Smart-Parking-System/ai_module/images/new.jpg"
]

for image in images:
    print(f"\nTesting image {image}")
    result=detect_plate(image)
    print(result)


