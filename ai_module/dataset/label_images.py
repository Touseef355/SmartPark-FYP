import os

folder = "D:/Smart-Parking-System/ai_module/dataset/images"

images = os.listdir(folder)
images.sort()

for i, image in enumerate(images):
    _, ext = os.path.splitext(image)      
    new_name = f"image_{i+1:03d}{ext}"  
    
    os.rename(
        os.path.join(folder, image),   
        os.path.join(folder, new_name)
    )
    
print("Rename complete!")