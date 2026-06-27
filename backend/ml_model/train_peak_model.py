import os
import sys
import joblib

# Fix: Build absolute path to backend directory so Django can find sps_backend settings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sps_backend.settings")

import django
django.setup()

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Import from same folder (ml_model), not full path
from feature_engineering import build_training_dataframe, generate_synthetic_data

# Directory where model files will be saved
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))


def label_peak(occupancy_rate):
    """
    Convert occupancy rate (0.0 - 1.0) into a human-readable peak label.
    Thresholds are based on typical parking management standards.
    """
    if occupancy_rate >= 0.75:
        return "busy"
    if occupancy_rate >= 0.40:
        return "moderate"
    return "quiet"


def train():
    # Step 1: Try to load real data from database
    print("Loading data from database...")
    df = build_training_dataframe()

    # Step 2: Fall back to synthetic data if DB has no records yet
    if df.empty:
        print("No real bookings found. Using synthetic data for training.")
        print("This is expected during development before system goes live.")
        df = generate_synthetic_data(days=180)

    print(f"Total training samples: {len(df)}")

    # Step 3: Encode site_id column (string → integer for the model)
    le = LabelEncoder()
    df["site_encoded"] = le.fit_transform(df["site_id"])

    # Step 4: Create target labels from occupancy rate
    df["label"] = df["occupancy_rate"].apply(label_peak)
    print("Label distribution:")
    print(df["label"].value_counts())

    # Step 5: Define features and target
    features = ["hour", "day_of_week", "is_weekend", "month", "site_encoded"]
    X = df[features]
    y = df["label"]

    # Step 6: Split into train and test sets (80/20 split)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Step 7: Train Random Forest Classifier
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=200,  # Number of decision trees
        max_depth=10,      # Prevent overfitting
        random_state=42
    )
    model.fit(X_train, y_train)

    # Step 8: Evaluate model performance on test set
    print("\nModel Performance Report:")
    print(classification_report(y_test, model.predict(X_test)))

    # Step 9: Save model and encoder to disk
    model_path   = os.path.join(MODEL_DIR, "peak_hour_model.joblib")
    encoder_path = os.path.join(MODEL_DIR, "site_id_encoder.joblib")

    joblib.dump(model, model_path)
    joblib.dump(le,    encoder_path)

    print(f"Model saved to:   {model_path}")
    print(f"Encoder saved to: {encoder_path}")
    print("Training complete!")


if __name__ == "__main__":
    train()