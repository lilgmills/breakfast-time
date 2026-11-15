import os
from app import create_app

# Load configuration based on environment variable, defaulting to development
config_name = os.getenv("FLASK_ENV", "development")
app = create_app(config_name)

if __name__ == "__main__":
    # Run the development server
    app.run(
        host=os.getenv("FLASK_RUN_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_RUN_PORT", 5000)),
        debug=(config_name == "development"),
    )
    
    print("running on port", 5000)