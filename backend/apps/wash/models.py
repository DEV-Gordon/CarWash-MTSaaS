from django.db import models
from apps.accounts.models import Business, BusinessUser


class Client(models.Model):
    # Represents a client of the car wash business, associated with a specific business and containing contact information and notes about the client.
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='clients')
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        # verbose name in spanish
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

    @property
    # returns the full name of the client by combining the first name and last name fields, providing a convenient way to display the client's name in a single string format.
    def full_name(self):
        return f'{self.first_name} {self.last_name}'


class Vehicle(models.Model):
    # Represents a vehicle owned by a client, associated with a specific business and containing details about the vehicle such as brand, model, year, plate number, color, and notes.
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='vehicles')
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    plate = models.CharField(max_length=20)
    color = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        # verbose name in spanish
        verbose_name = 'Vehículo'
        verbose_name_plural = 'Vehículos'

    def __str__(self):
        return f'{self.brand} {self.model} — {self.plate}'


class Employee(models.Model):
    # Represents an employee of the car wash business, associated with a specific business and optionally linked to a user account for authentication. It contains personal details about the employee such as name, contact information, hire date, and active status.
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='employees')
    user = models.OneToOneField(
        BusinessUser, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='employee_profile'
    )
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    hire_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'


class WashService(models.Model):
    # Represents a car wash service offered by the business, associated with a specific business and containing details about the service such as name, description, price, duration, and active status.
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration_minutes = models.PositiveSmallIntegerField(default=30)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} — ${self.price}'


class Appointment(models.Model):
    # Represents an appointment for a car wash service, associated with a specific business and containing details about the appointment such as the vehicle being serviced, the employee assigned to the appointment, the services requested, the scheduled time, status, notes, total price, and timestamps for creation and updates.
    STATUS_PENDING = 'pending'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_DONE = 'done'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_IN_PROGRESS, 'En proceso'),
        (STATUS_DONE, 'Completada'),
        (STATUS_CANCELLED, 'Cancelada'),
    ]

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='appointments')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='appointments')
    employee = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='appointments'
    )
    services = models.ManyToManyField(WashService, related_name='appointments')
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cita'
        verbose_name_plural = 'Citas'
        ordering = ['-scheduled_at']

    def __str__(self):
        return f'Cita #{self.id} — {self.vehicle} ({self.get_status_display()})'

    def calculate_total(self):
        self.total_price = sum(s.price for s in self.services.all())
        self.save(update_fields=['total_price'])
        return self.total_price
