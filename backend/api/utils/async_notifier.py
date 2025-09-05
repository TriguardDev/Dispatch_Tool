import threading
from typing import Dict, Any
from utils.notifier import send_sms, send_email

def send_notifications_async(notifications: list):
    """
    Send notifications asynchronously in a background thread.
    
    Args:
        notifications (list): List of notification dictionaries
    """
    def _send_notifications():
        for notification in notifications:
            if notification['type'] == 'sms' and notification.get('phone'):
                send_sms(notification['phone'], notification['message'])
            elif notification['type'] == 'email' and notification.get('email'):
                send_email(
                    to_email=notification['email'],
                    subject=notification['subject'],
                    html_body=notification['html_body']
                )
    
    # Start notifications in a background thread
    thread = threading.Thread(target=_send_notifications, daemon=True)
    thread.start()

def prepare_booking_notifications(booking_data: Dict[str, Any], is_update: bool = False) -> list:
    """
    Prepare notification data for booking operations.
    
    Args:
        booking_data (dict): Booking information with customer and agent details
        is_update (bool): Whether this is an update or creation
        
    Returns:
        list: List of notification dictionaries
    """
    notifications = []
    
    if is_update:
        # Update notifications
        customer_message = (
            f"Hi {booking_data['customer_name']}, the status of your booking on "
            f"{booking_data['booking_date']} at {booking_data['booking_time']} has been updated to '{booking_data['status']}'."
        )
        
        if booking_data.get('agent_name'):
            agent_message = (
                f"Hi {booking_data['agent_name']}, the status of booking with "
                f"{booking_data['customer_name']} on {booking_data['booking_date']} at {booking_data['booking_time']} "
                f"has been updated to '{booking_data['status']}'."
            )
    else:
        # Creation notifications
        customer_message = (
            f"Hi {booking_data['customer_name']}, your booking with {booking_data['agent_name']} "
            f"on {booking_data['booking_date']} at {booking_data['booking_time']} has been confirmed."
        )
        
        agent_message = (
            f"Hi {booking_data['agent_name']}, you have a new booking with {booking_data['customer_name']} "
            f"on {booking_data['booking_date']} at {booking_data['booking_time']}."
        )
    
    # Customer notifications - send both SMS and email if available
    if booking_data.get('customer_email'):
        notifications.append({
            'type': 'email',
            'email': booking_data['customer_email'],
            'subject': 'Booking Status Updated' if is_update else 'Booking Confirmation',
            'html_body': f"<p>{customer_message}</p>"
        })
    
    if booking_data.get('customer_phone'):
        notifications.append({
            'type': 'sms',
            'phone': booking_data['customer_phone'],
            'message': customer_message
        })
    
    # Agent notifications - send both SMS and email if available
    if booking_data.get('agent_name'):
        if booking_data.get('agent_email'):
            notifications.append({
                'type': 'email',
                'email': booking_data['agent_email'],
                'subject': 'Booking Status Updated' if is_update else 'New Booking Assigned',
                'html_body': f"<p>{agent_message}</p>"
            })
        
        if booking_data.get('agent_phone'):
            notifications.append({
                'type': 'sms',
                'phone': booking_data['agent_phone'],
                'message': agent_message
            })
    
    return notifications