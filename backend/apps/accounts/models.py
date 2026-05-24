from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta


class Business(models.Model):
    #represents a business entity that can have multiple users and a subscription.
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    owner_name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        #verbose name in spanish
        verbose_name = 'Negocio'
        verbose_name_plural = 'Negocios'

    def __str__(self):
        return self.name

    @property
    # returns the subscription status of the business, or 'none' if no subscription exists.
    def subscription_status(self):
        try:
            return self.subscription.status
        except Subscription.DoesNotExist:
            return 'none'

    @property
    # returns True if the subscription status is 'active', otherwise False.
    def is_subscription_active(self):
        return self.subscription_status == 'active'


class Subscription(models.Model):
    # represents a monthly subscription for each business.

    # Subscription status choices
    STATUS_ACTIVE = 'active'
    STATUS_EXPIRED = 'expired'
    STATUS_SUSPENDED = 'suspended'
    STATUS_TRIAL = 'trial'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Activa'),
        (STATUS_EXPIRED, 'Vencida'),
        (STATUS_SUSPENDED, 'Suspendida'),
        (STATUS_TRIAL, 'Prueba'),
    ]

    PLAN_MONTHLY = 'monthly'
    PLAN_CHOICES = [
        (PLAN_MONTHLY, 'Mensual'),
    ]

    # Each business can have only one subscription, hence OneToOneField.
    business = models.OneToOneField(
        Business, on_delete=models.CASCADE, related_name='subscription'
    )
    # For simplicity, we only have a monthly plan, but this can be extended in the future.
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_MONTHLY)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TRIAL)

    # start_date is when the subscription starts, end_date is when it ends. Price is fixed for now.
    start_date = models.DateField()
    end_date = models.DateField()

    # price is the cost of the subscription, defaulting to 15.00 for the monthly plan.
    price = models.DecimalField(max_digits=8, decimal_places=2, default=15.00)
    auto_renew = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        #verbose name in spanish
        verbose_name = 'Suscripción'
        verbose_name_plural = 'Suscripciones'

    def __str__(self):
        return f'{self.business.name} — {self.get_status_display()}'

    def check_and_update_status(self):
        # Check if the subscription has expired and update status accordingly.
        today = timezone.now().date()
        # If the subscription is active but the end date has passed, mark it as expired.
        if self.status == self.STATUS_ACTIVE and today > self.end_date:
            self.status = self.STATUS_EXPIRED
            self.save(update_fields=['status', 'updated_at'])
        return self.status

    def renew(self, months=1):
        # Renew the subscription by extending the end date by a specified number of months.
        today = timezone.now().date()
        base = max(today, self.end_date)
        # Approximate month as 30 days for simplicity
        self.end_date = base + timedelta(days=30 * months)
        self.status = self.STATUS_ACTIVE
        self.save(update_fields=['end_date', 'status', 'updated_at'])

    @property
    # Calculate the number of days remaining until the subscription expires. If expired, return 0.
    def days_remaining(self):
        today = timezone.now().date()
        delta = (self.end_date - today).days
        return max(delta, 0)

    @property
    # Check if the subscription is currently active by verifying its status and updating it if necessary.
    def is_active(self):
        self.check_and_update_status()
        return self.status == self.STATUS_ACTIVE


class BusinessUser(AbstractUser):
    # user accounts associated with a business, with different roles and permissions.

    ROLE_ADMIN = 'admin'
    ROLE_EMPLOYEE = 'employee'
    ROLE_SUPERADMIN = 'superadmin'

    # Role choices for users, defining their permissions and access levels within the business.
    ROLE_CHOICES = [
        # Admin users have full access to manage the business and its subscription.
        (ROLE_ADMIN, 'Administrador'), 
        # Employee users have limited access, typically to view and manage their own profile and tasks.
        (ROLE_EMPLOYEE, 'Empleado'), 
        # Super Admin users have the highest level of access, often reserved for system administrators who can manage multiple businesses and users.
        (ROLE_SUPERADMIN, 'Super Admin'), 
    ]

    business = models.ForeignKey(
        Business, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='users'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_EMPLOYEE)
    phone = models.CharField(max_length=20, blank=True)

    class Meta:
        # verbose name in spanish
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        # Return the username along with the role display name for better identification of the user's role in the system.
        return f'{self.username} ({self.get_role_display()})'

    @property
    # Check if the user has an admin role, which includes both 'admin' and 'superadmin' roles, granting them elevated permissions within the system.
    def is_admin(self):
        return self.role in (self.ROLE_ADMIN, self.ROLE_SUPERADMIN)
