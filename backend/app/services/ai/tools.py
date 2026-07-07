from langchain_core.tools import tool


@tool
def book_appointment_tool(date: str, time: str, details: str = "") -> str:
    """
    Book an appointment/meeting with a company representative.
    Use this tool when the customer requests to schedule a call, meeting, or book an appointment.
    
    Arguments:
    - date: The date requested (e.g., 'YYYY-MM-DD').
    - time: The time slot requested (e.g., '14:00').
    - details: Optional details or notes for the appointment.
    """
    # In Phase 5, we will hook this up to save to the database.
    return f"Success: Appointment successfully booked for {date} at {time}. Notes: {details}"


@tool
def escalate_to_human_tool(reason: str) -> str:
    """
    Escalate the conversation to a human support agent.
    Use this tool when the user explicitly requests a human, is highly frustrated,
    or has an issue that the AI cannot resolve using the knowledge base.
    
    Arguments:
    - reason: A summary description of why the user's issue is being escalated.
    """
    # In Phase 5, we will hook this up to create a support ticket in PostgreSQL.
    return f"Success: Support ticket generated for human agent review. Reason: {reason}"


# Export the tool list
tools = [book_appointment_tool, escalate_to_human_tool]
