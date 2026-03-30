from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Any, Dict, List, Optional


@dataclass
class Address:
    street: str = ""
    city: str = ""
    province: str = ""
    country: str = ""
    postalcode: str = ""

    def editAddress(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def enterAddress(self, street: str, city: str, province: str, country: str, postalcode: str) -> None:
        self.street = street
        self.city = city
        self.province = province
        self.country = country
        self.postalcode = postalcode

    def updateAddress(self, **kwargs) -> None:
        self.editAddress(**kwargs)

    def archiveAddress(self) -> Dict[str, str]:
        return {
            "street": self.street,
            "city": self.city,
            "province": self.province,
            "country": self.country,
            "postalcode": self.postalcode,
        }


@dataclass
class User:
    username: str
    password: str
    firstName: str = ""
    lastName: str = ""
    phoneNumber: str = ""
    email: str = ""
    birthdate: Optional[date] = None
    sin: str = ""

    def login(self) -> bool:
        # Runtime auth is implemented in app.py -> /api/login.
        return bool(self.username and self.password)

    def logOut(self) -> bool:
        return True

    def updateProfile(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)


@dataclass
class Notification:
    notificationID: str
    notificationText: str = ""
    notificationType: str = "info"
    status: str = "new"
    timestamp: Optional[datetime] = None

    def markSent(self) -> None:
        self.status = "sent"
        self.timestamp = datetime.now()

    def composeMessage(self, text: str) -> None:
        self.notificationText = text

    def includeLink(self, link: str) -> None:
        if link:
            self.notificationText = f"{self.notificationText}\n{link}".strip()

    def logNotif(self) -> Dict[str, Any]:
        return {
            "notificationID": self.notificationID,
            "notificationType": self.notificationType,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

    def markOpened(self) -> None:
        self.status = "opened"

    def generateEmail(self) -> Dict[str, str]:
        return {
            "subject": f"[{self.notificationType}] Notification",
            "body": self.notificationText,
        }


@dataclass
class Appointment:
    appointmentID: str
    appointmentType: str = "window_cleaning"
    date: Optional[date] = None
    startTime: Optional[time] = None
    endTime: Optional[time] = None
    serviceType: str = ""
    status: str = "booked"
    duration: int = 60
    notes: str = ""

    def addAppointment(self) -> Dict[str, Any]:
        # Runtime create is in app.py -> /api/book
        return self.__dict__.copy()

    def cancelAppointment(self, reason: str = "") -> None:
        # Runtime cancel is in app.py -> /api/cancel-booking
        self.status = "canceled"
        if reason:
            self.notes = f"{self.notes}\nCancel reason: {reason}".strip()

    def updateAppointment(self, **kwargs) -> None:
        # Runtime update is in app.py -> /api/update-booking
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)


@dataclass
class Schedule:
    scheduleID: str
    month: Optional[date] = None
    day: Optional[date] = None
    year: Optional[date] = None
    time: Optional[time] = None
    appointmentID: str = ""

    def getAvailableSlots(self) -> List[str]:
        # Runtime slots in app.py -> generate_day_slots + /api/availability
        return []

    def validateAvailability(self) -> bool:
        return True

    def retrieveAppDetails(self) -> Dict[str, Any]:
        return {"appointmentID": self.appointmentID}

    def flagCapLimit(self) -> bool:
        return False

    def notificationError(self) -> str:
        return "No errors"


@dataclass
class Client(User):
    clientID: str = ""
    serviceType: str = ""
    contactInfo: str = ""
    appointments: List[Appointment] = field(default_factory=list)

    def openBooking(self) -> Dict[str, str]:
        return {"action": "openBooking"}

    def selectDateTime(self, selected_date: str, selected_time: str) -> Dict[str, str]:
        return {"date": selected_date, "time": selected_time}

    def bookAppointment(self, appointment: Appointment) -> None:
        # Runtime booking in app.py -> /api/book
        self.appointments.append(appointment)

    def enterContactInfo(self, contact: str) -> None:
        self.contactInfo = contact

    def cancelAppointment(self, appointment_id: str) -> bool:
        for appt in self.appointments:
            if appt.appointmentID == appointment_id:
                appt.cancelAppointment()
                return True
        return False

    def modifyAppointment(self, appointment_id: str, **kwargs) -> bool:
        for appt in self.appointments:
            if appt.appointmentID == appointment_id:
                appt.updateAppointment(**kwargs)
                return True
        return False

    def openNotif(self) -> Dict[str, str]:
        return {"action": "openNotif"}

    def selectAcceptedQuote(self) -> Dict[str, str]:
        return {"quote": "accepted"}

    def selectRefusedQuote(self) -> Dict[str, str]:
        return {"quote": "refused"}


@dataclass
class Employee(User):
    employeeID: str = ""
    role: str = "employee"
    workloadHours: int = 40
    isActive: bool = True
    availability: Dict[str, List[str]] = field(default_factory=dict)

    def enterAvailability(self, day_key: str, slots: List[str]) -> None:
        # Runtime availability in app.py -> /api/set-availability
        self.availability[day_key] = slots

    def updateWorkload(self, hours: int) -> None:
        # Runtime workload in app.py -> /api/set-workload
        self.workloadHours = int(hours)

    def viewSchedule(self) -> Dict[str, List[str]]:
        return self.availability

    def selectSchedule(self, template_name: str) -> Dict[str, str]:
        # Runtime templates in app.py -> /api/select-schedule
        return {"template": template_name}

    def confirmAvailability(self) -> bool:
        return True

    def cancelAvailability(self, day_key: str) -> None:
        self.availability.pop(day_key, None)

    def editAvailability(self, day_key: str, slots: List[str]) -> None:
        self.availability[day_key] = slots

    def viewProfile(self) -> Dict[str, Any]:
        return {
            "employeeID": self.employeeID,
            "name": f"{self.firstName} {self.lastName}".strip(),
            "role": self.role,
            "workloadHours": self.workloadHours,
            "isActive": self.isActive,
        }


@dataclass
class Report:
    reportID: str
    format: str = "json"
    employeeID: str = ""
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    totalBookings: int = 0
    totalHours: int = 0

    def generateSummary(self) -> Dict[str, Any]:
        return {
            "reportID": self.reportID,
            "employeeID": self.employeeID,
            "totalBookings": self.totalBookings,
            "totalHours": self.totalHours,
            "format": self.format,
        }

    def filterByEmployee(self, employee_id: str) -> None:
        self.employeeID = employee_id

    def filterByDateRange(self, start_date: date, end_date: date) -> None:
        self.startDate = start_date
        self.endDate = end_date

    def selectFormat(self, fmt: str) -> None:
        self.format = fmt

    def downloadReport(self) -> Dict[str, str]:
        return {"status": "ready", "format": self.format}

    def generatePDF(self) -> Dict[str, str]:
        return {"format": "pdf", "status": "generated"}

    def generateExcel(self) -> Dict[str, str]:
        return {"format": "excel", "status": "generated"}


@dataclass
class Manager(Employee):
    managerID: str = ""

    def manageSchedule(self) -> Dict[str, str]:
        return {"action": "manageSchedule"}

    def assignAppointments(self) -> Dict[str, str]:
        # Runtime assign in app.py -> /api/manager/assign-booking
        return {"action": "assignAppointments"}

    def viewSchedule(self) -> Dict[str, str]:
        return {"action": "viewSchedule"}

    def createProfile(self) -> Dict[str, str]:
        # Runtime create employee in app.py -> /api/manager/create-employee
        return {"action": "createProfile"}

    def enterEmpinfo(self) -> Dict[str, str]:
        return {"action": "enterEmpinfo"}

    def sendAccess(self) -> Dict[str, str]:
        return {"action": "sendAccess"}

    def viewAppointments(self) -> Dict[str, str]:
        return {"action": "viewAppointments"}

    def confirmAppointments(self) -> Dict[str, str]:
        return {"action": "confirmAppointments"}

    def navigateDashboard(self) -> Dict[str, str]:
        return {"action": "navigateDashboard"}

    def selectReport(self) -> Dict[str, str]:
        return {"action": "selectReport"}

    def selectFormat(self, fmt: str) -> Dict[str, str]:
        return {"action": "selectFormat", "format": fmt}

    def downloadReport(self) -> Dict[str, str]:
        return {"action": "downloadReport"}


@dataclass
class System:
    systemID: str
    employeeID: str = ""
    clientID: str = ""
    notificationID: str = ""

    def verifyAppointments(self) -> bool:
        return True

    def recordProfile(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        return profile

    def validateInput(self, payload: Dict[str, Any]) -> bool:
        return bool(payload)

    def retrieveProfile(self, profile_id: str) -> Dict[str, str]:
        return {"profile_id": profile_id}

    def retrieveSchedule(self, schedule_id: str) -> Dict[str, str]:
        return {"schedule_id": schedule_id}

    def recordEmpAvailability(self, employee_id: str, day_key: str, slots: List[str]) -> Dict[str, Any]:
        return {"employee_id": employee_id, "day": day_key, "slots": slots}

    def logModification(self, text: str) -> Dict[str, str]:
        return {"log": text}

    def summarizeData(self) -> Dict[str, str]:
        return {"status": "ok"}

