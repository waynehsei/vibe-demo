import os

# Create data directory if it doesn't exist
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

# OpenAI API Key
OPENAI_API_KEY=os.getenv("OPENAI_API_KEY")

# USER_CONVERSATION
DEFAULT_CONVERSATION_ID='default'
SLACK_CONVERSATION_ID='slack'
USER_ID = "USER"
BOT_ID = "AI"
