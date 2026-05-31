from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to authenticated users with an admin role.

    Relies on BusinessUser.is_admin, which is True for 'admin' and
    'superadmin' roles. Employees are denied.
    """
    message = 'Solo los administradores pueden acceder a este recurso.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'is_admin', False))
