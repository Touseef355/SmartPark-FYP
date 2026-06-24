from ultralytics import YOLO

# YOLOv8 small model load karo
model = YOLO('yolov8s.pt')
# yolov8s — small model

# Train karo
model.train(
    data='dataset/data.yaml',  # dataset config
    epochs=50,                  # 50 baar train karega
    imgsz=640,                  # image size
    batch=8,                    # ek baar mein 8 images
    name='plate_detector',      # model ka naam
    patience=10                 # 10 epochs mein improvement nahi → stop
)

print("Training complete!")