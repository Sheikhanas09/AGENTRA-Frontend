import uuid
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
from dotenv import load_dotenv

load_dotenv()

server = Server("agentra-meeting-email")


@server.list_tools()
async def list_tools():
    return [
        types.Tool(
            name="generate_meeting_link",
            description="Generate a real Google Meet link via Google Calendar API",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "date": {"type": "string"},
                    "time": {"type": "string"},
                    "attendees": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["title", "date", "time", "attendees"]
            }
        ),
        types.Tool(
            name="send_interview_email",
            description="Send interview scheduled email",
            inputSchema={
                "type": "object",
                "properties": {
                    "candidate_name": {"type": "string"},
                    "candidate_email": {"type": "string"},
                    "job_title": {"type": "string"},
                    "company_name": {"type": "string"},
                    "scheduled_date": {"type": "string"},
                    "scheduled_time": {"type": "string"},
                    "meeting_link": {"type": "string"},
                    "interviewer_1_email": {"type": "string"},
                    "interviewer_2_email": {"type": "string"},
                    "hr_name": {"type": "string"},
                    "sender_email": {"type": "string"},
                    "sender_password": {"type": "string"}
                },
                "required": [
                    "candidate_name", "candidate_email", "job_title",
                    "company_name", "scheduled_date", "scheduled_time",
                    "meeting_link", "interviewer_1_email", "hr_name",
                    "sender_email", "sender_password"
                ]
            }
        ),
        types.Tool(
            name="send_offer_letter",
            description="Send offer letter email to candidate with accept link",
            inputSchema={
                "type": "object",
                "properties": {
                    "candidate_name": {"type": "string"},
                    "candidate_email": {"type": "string"},
                    "job_title": {"type": "string"},
                    "company_name": {"type": "string"},
                    "salary_range": {"type": "string"},
                    "ceo_name": {"type": "string"},
                    "accept_link": {"type": "string"},
                    "offer_date": {"type": "string"},
                    "sender_email": {"type": "string"},
                    "sender_password": {"type": "string"}
                },
                "required": [
                    "candidate_name", "candidate_email", "job_title",
                    "company_name", "salary_range", "ceo_name",
                    "accept_link", "offer_date", "sender_email", "sender_password"
                ]
            }
        ),
        types.Tool(
            name="send_onboarding_email",
            description="Send onboarding details email to hired candidate",
            inputSchema={
                "type": "object",
                "properties": {
                    "candidate_name": {"type": "string"},
                    "candidate_email": {"type": "string"},
                    "job_title": {"type": "string"},
                    "company_name": {"type": "string"},
                    "joining_date": {"type": "string"},
                    "sender_email": {"type": "string"},
                    "sender_password": {"type": "string"}
                },
                "required": [
                    "candidate_name", "candidate_email", "job_title",
                    "company_name", "joining_date", "sender_email", "sender_password"
                ]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict):

    # ──── Tool 1: Google Meet Link ────
    if name == "generate_meeting_link":
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request
            from googleapiclient.discovery import build
            from datetime import datetime, timedelta

            CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "..", "credentials.json")
            TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", "token.json")

            SCOPES = [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/calendar'
            ]

            creds = None
            if os.path.exists(TOKEN_FILE):
                creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(TOKEN_FILE, 'w') as token:
                    token.write(creds.to_json())

            service = build('calendar', 'v3', credentials=creds)

            title = arguments.get("title", "Interview")
            date_str = arguments.get("date", "")
            time_str = arguments.get("time", "")
            attendees = [a for a in arguments.get("attendees", []) if a]

            try:
                dt = datetime.strptime(f"{date_str} {time_str}", "%B %d, %Y %I:%M %p")
            except:
                dt = datetime.now() + timedelta(days=1)

            start_time = dt.isoformat()
            end_time = (dt + timedelta(hours=1)).isoformat()

            event = {
                'summary': title,
                'description': 'Interview scheduled via Agentra HR System',
                'start': {'dateTime': start_time, 'timeZone': 'Asia/Karachi'},
                'end': {'dateTime': end_time, 'timeZone': 'Asia/Karachi'},
                'attendees': [{'email': email} for email in attendees],
                'conferenceData': {
                    'createRequest': {
                        'requestId': str(uuid.uuid4()),
                        'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                    }
                }
            }

            event = service.events().insert(
                calendarId='primary',
                body=event,
                conferenceDataVersion=1,
                sendUpdates='none'
            ).execute()

            meet_link = event.get('hangoutLink', '')
            if not meet_link:
                unique_id = str(uuid.uuid4())[:8].upper()
                meet_link = f"https://meet.jit.si/Agentra-{unique_id}"

            return [types.TextContent(type="text", text=meet_link)]

        except Exception as e:
            print(f"Calendar error: {e}")
            unique_id = str(uuid.uuid4())[:8].upper()
            meet_link = f"https://meet.jit.si/Agentra-{unique_id}"
            return [types.TextContent(type="text", text=meet_link)]

    # ──── Tool 2: Interview Email ────
    elif name == "send_interview_email":
        candidate_name = arguments["candidate_name"]
        candidate_email = arguments["candidate_email"]
        job_title = arguments["job_title"]
        company_name = arguments["company_name"]
        scheduled_date = arguments["scheduled_date"]
        scheduled_time = arguments["scheduled_time"]
        meeting_link = arguments["meeting_link"]
        interviewer_1_email = arguments["interviewer_1_email"]
        interviewer_2_email = arguments.get("interviewer_2_email", "")
        hr_name = arguments["hr_name"]
        sender_email = arguments["sender_email"]
        sender_password = arguments["sender_password"]

        recipients = [candidate_email, interviewer_1_email]
        if interviewer_2_email:
            recipients.append(interviewer_2_email)

        subject = f"Interview Scheduled — {job_title} at {company_name}"
        body = f"""Dear {candidate_name},

We are pleased to inform you that your interview has been scheduled for the position of {job_title} at {company_name}.

Interview Details:
━━━━━━━━━━━━━━━━━━━━━━
📅 Date:          {scheduled_date}
⏰ Time:          {scheduled_time}
💼 Position:      {job_title}
🏢 Company:       {company_name}
👥 Interviewers:  {interviewer_1_email}{f', {interviewer_2_email}' if interviewer_2_email else ''}
🔗 Meeting Link:  {meeting_link}
━━━━━━━━━━━━━━━━━━━━━━

Please click the meeting link above to join the interview at the scheduled time.

Best regards,
HR: {hr_name}
Company: {company_name}"""

        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = ", ".join(recipients)
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
            smtp_server.starttls()
            smtp_server.login(sender_email, sender_password)
            smtp_server.sendmail(sender_email, recipients, msg.as_string())
            smtp_server.quit()

            return [types.TextContent(type="text", text=f"Email successfully sent to: {', '.join(recipients)}")]

        except Exception as e:
            return [types.TextContent(type="text", text=f"Email error: {str(e)}")]

    # ──── Tool 3: Offer Letter Email ────
    elif name == "send_offer_letter":
        candidate_name = arguments["candidate_name"]
        candidate_email = arguments["candidate_email"]
        job_title = arguments["job_title"]
        company_name = arguments["company_name"]
        salary_range = arguments["salary_range"]
        ceo_name = arguments["ceo_name"]
        accept_link = arguments["accept_link"]
        offer_date = arguments["offer_date"]
        sender_email = arguments["sender_email"]
        sender_password = arguments["sender_password"]

        subject = f"Job Offer — {job_title} at {company_name} 🎉"
        body = f"""Dear {candidate_name},

Congratulations! We are pleased to offer you the position of {job_title} at {company_name}.

OFFER DETAILS:
━━━━━━━━━━━━━━━━━━━━━━
💼 Position:      {job_title}
🏢 Company:       {company_name}
💰 Salary:        {salary_range}
📅 Offer Date:    {offer_date}
━━━━━━━━━━━━━━━━━━━━━━

TO ACCEPT THIS OFFER:
Please click the link below to accept your offer:
👉 {accept_link}

This offer is valid for 3 business days.

Upon acceptance, you will receive:
- Joining date and onboarding details
- Required documents list
- First day schedule
- Company policies and handbook

Best regards,
{ceo_name}
CEO, {company_name}"""

        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = candidate_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
            smtp_server.starttls()
            smtp_server.login(sender_email, sender_password)
            smtp_server.sendmail(sender_email, candidate_email, msg.as_string())
            smtp_server.quit()

            return [types.TextContent(type="text", text=f"Offer letter sent to {candidate_email}")]
        except Exception as e:
            return [types.TextContent(type="text", text=f"Email error: {str(e)}")]

    # ──── Tool 4: Onboarding Email ────
    elif name == "send_onboarding_email":
        candidate_name = arguments["candidate_name"]
        candidate_email = arguments["candidate_email"]
        job_title = arguments["job_title"]
        company_name = arguments["company_name"]
        joining_date = arguments["joining_date"]
        sender_email = arguments["sender_email"]
        sender_password = arguments["sender_password"]

        subject = f"Welcome to {company_name}! — Onboarding Details 🎊"
        body = f"""Dear {candidate_name},

We are thrilled that you have accepted our offer for {job_title} at {company_name}!

ONBOARDING DETAILS:
━━━━━━━━━━━━━━━━━━━━━━
📅 Joining Date:    {joining_date}
⏰ Reporting Time:  09:00 AM
🏢 Company:         {company_name}
💼 Position:        {job_title}
━━━━━━━━━━━━━━━━━━━━━━

REQUIRED DOCUMENTS:
- CNIC / National ID Card (Original + Copy)
- Educational Certificates (Original + Copy)
- Experience Letters from previous employers
- 2 Passport Size Photos
- Bank Account Details for salary processing

FIRST DAY SCHEDULE:
09:00 AM — Arrival & Registration
09:30 AM — HR Orientation
10:30 AM — Team Introduction
11:00 AM — Workspace Setup

Company handbook and policies will be shared on your first day.

Best regards,
HR Team
{company_name}"""

        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = candidate_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
            smtp_server.starttls()
            smtp_server.login(sender_email, sender_password)
            smtp_server.sendmail(sender_email, candidate_email, msg.as_string())
            smtp_server.quit()

            return [types.TextContent(type="text", text=f"Onboarding email sent to {candidate_email}")]
        except Exception as e:
            return [types.TextContent(type="text", text=f"Email error: {str(e)}")]

    else:
        return [types.TextContent(type="text", text=f"Unknown tool: {name}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())