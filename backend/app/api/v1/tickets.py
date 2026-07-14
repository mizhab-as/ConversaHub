from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import RoleChecker, get_current_active_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.ticket import TicketRepository
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse

router = APIRouter()

# Access control dependencies
get_admin_user = RoleChecker(["admin"])
get_staff_user = RoleChecker(["admin", "agent"])


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Open a new support ticket.
    Accessible to any authenticated active user.
    """
    ticket_repo = TicketRepository(db)
    ticket_data = {
        "user_id": current_user.id,
        "subject": ticket_in.subject,
        "description": ticket_in.description,
        "priority": ticket_in.priority,
        "status": "open",
        "assigned_agent_id": None
    }
    db_ticket = await ticket_repo.create(obj_in=ticket_data)
    return db_ticket


@router.get("", response_model=List[TicketResponse])
async def list_tickets(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    List tickets.
    Customers see only their own tickets. Support Agents and Admins see all active tickets.
    """
    ticket_repo = TicketRepository(db)
    if current_user.role in ["admin", "agent"]:
        # Staff sees all active tickets
        tickets = await ticket_repo.get_all_active()
    else:
        # Customer sees only their own tickets
        tickets = await ticket_repo.get_all_by_user(current_user.id)
    return tickets


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Get a single support ticket by ID.
    Customers can only retrieve their own tickets. Support Agents and Admins can retrieve any ticket.
    """
    ticket_repo = TicketRepository(db)
    db_ticket = await ticket_repo.get(ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    if current_user.role not in ["admin", "agent"] and db_ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this ticket."
        )
    return db_ticket


@router.put("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    ticket_id: int,
    current_user: User = Depends(get_staff_user),
    db=Depends(get_db)
):
    """
    Assign a ticket to the current staff member and update status.
    Restricted to Admins and Support Agents.
    """
    ticket_repo = TicketRepository(db)
    db_ticket = await ticket_repo.get(ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    db_ticket.assigned_agent_id = current_user.id
    db_ticket.status = "assigned"
    
    db.add(db_ticket)
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket


@router.put("/{ticket_id}/unassign", response_model=TicketResponse)
async def unassign_ticket(
    ticket_id: int,
    current_user: User = Depends(get_staff_user),
    db=Depends(get_db)
):
    """
    Unassign a ticket — clears the assigned agent and resets status to 'open'.
    Restricted to Admins and Support Agents.
    """
    ticket_repo = TicketRepository(db)
    db_ticket = await ticket_repo.get(ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    db_ticket.assigned_agent_id = None
    db_ticket.status = "open"

    db.add(db_ticket)
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket


@router.put("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: int,
    update_in: TicketUpdate,
    current_user: User = Depends(get_staff_user),
    db=Depends(get_db)
):
    """
    Update a ticket's status, priority, or assignment details.
    Restricted to Admins and Support Agents.
    """
    ticket_repo = TicketRepository(db)
    db_ticket = await ticket_repo.get(ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    update_data = update_in.model_dump(exclude_unset=True)
    db_ticket = await ticket_repo.update(db_obj=db_ticket, obj_in=update_data)
    return db_ticket


from pydantic import BaseModel, Field

class TicketMessageCreate(BaseModel):
    text: str = Field(..., min_length=1)


@router.post("/{ticket_id}/message", response_model=TicketResponse)
async def send_ticket_message(
    ticket_id: int,
    msg_in: TicketMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Send a message on a support ticket.
    Accessible to the ticket owner (Customer) or support staff (Agents/Admins).
    """
    import json
    from datetime import datetime
    
    ticket_repo = TicketRepository(db)
    db_ticket = await ticket_repo.get(ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    if current_user.role not in ["admin", "agent"] and db_ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to post messages to this ticket."
        )
        
    # Append message to list
    existing_messages_str = db_ticket.messages or "[]"
    try:
        messages_list = json.loads(existing_messages_str)
    except Exception:
        messages_list = []
        
    new_msg = {
        "sender": current_user.role,
        "sender_email": current_user.email,
        "text": msg_in.text,
        "created_at": datetime.now().isoformat()
    }
    messages_list.append(new_msg)
    db_ticket.messages = json.dumps(messages_list)
    
    db.add(db_ticket)
    await db.commit()
    await db.refresh(db_ticket)
    
    return db_ticket


@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: int,
    current_user: User = Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Delete a support ticket by ID.
    Restricted to Admin users.
    """
    ticket_repo = TicketRepository(db)
    db_ticket = await ticket_repo.get(ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    await ticket_repo.remove(id=ticket_id)
    return {"message": "Ticket deleted successfully"}
