import os
import queue
import threading
import requests
from slack_sdk.web import WebClient
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.response import SocketModeResponse
from slack_sdk.socket_mode.request import SocketModeRequest
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize message queue
message_queue = queue.Queue()

# Initialize SocketModeClient with an app-level token + WebClient
client = SocketModeClient(
    app_token=os.environ.get("SLACK_APP_TOKEN"),
    web_client=WebClient(token=os.environ.get("SLACK_BOT_TOKEN"))
)

def process_message(message_data):
    """Process a message by sending it to the API and returning the response."""
    try:
        response = requests.post(
            'http://localhost:8000/v1/conversations/slack/messages',
            json={
                'user_id': message_data['user'],
                'content': message_data['text']
            }
        )
        
        if response.status_code == 201:
            return response.json().get('message')
        else:
            logger.error(f"API error: {response.status_code}")
            return "Sorry, I couldn't process your message."
    except requests.RequestException as e:
        logger.error(f"Network error: {e}")
        return "Sorry, I'm having trouble connecting to the server."
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        return "Sorry, something went wrong while processing your message."

def message_consumer():
    """Consumer thread that processes messages from the queue."""
    while True:
        try:
            # Get message from queue (blocks until a message is available)
            message_data = message_queue.get()
            logger.info(f"Processing message from user: {message_data['user']}")
            
            # Process message
            response = process_message(message_data)
            
            # Send response back to Slack
            if response:
                try:
                    client.web_client.chat_postMessage(
                        channel=message_data['channel'],
                        thread_ts=message_data.get('thread_ts'),
                        text=response
                    )
                except Exception as e:
                    logger.error(f"Error sending message to Slack: {e}")
            
            # Mark task as done
            message_queue.task_done()
            
        except Exception as e:
            logger.error(f"Error in consumer: {e}")

def process(client: SocketModeClient, req: SocketModeRequest):
    """Handle incoming Socket Mode requests."""
    try:
        # Only process message events
        if req.type == "events_api" and req.payload["event"]["type"] == "message":
            # Acknowledge the request
            response = SocketModeResponse(envelope_id=req.envelope_id)
            client.send_socket_mode_response(response)
            
            event = req.payload["event"]
            
            # Ignore bot messages and messages without text
            if event.get("subtype") is not None or event.get("bot_id") is not None:
                return
            
            # Add message to queue
            message_data = {
                'user': event['user'],
                'channel': event['channel'],
                'text': event['text'],
                'thread_ts': event.get('thread_ts', event['ts'])
            }
            message_queue.put(message_data)
            logger.info(f"Message queued from user: {message_data['user']}")
            
    except Exception as e:
        logger.error(f"Error handling request: {e}")

def main():
    """Main function to start the bot."""
    try:
        # Start the consumer thread
        consumer_thread = threading.Thread(target=message_consumer, daemon=True)
        consumer_thread.start()
        
        # Add the message listener
        client.socket_mode_request_listeners.append(process)
        
        # Connect to Slack
        logger.info("Connecting to Slack...")
        client.connect()
        
        # Keep the main thread running
        Event = threading.Event()
        Event.wait()
        
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Error in main: {e}")

if __name__ == "__main__":
    main()
