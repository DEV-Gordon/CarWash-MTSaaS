from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Allow access only to authenticated users with an admin role.

    Relies on BusinessUser.is_admin, which is True for 'admin' and
    'superadmin' roles. Employees are denied.
    """
    message = 'Solo los administradores pueden acceder a este recurso.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'is_admin', False))


class IsAdminOrReadOnly(BasePermission):
    """Read access for any authenticated user; writes only for admins.

    Used on the subscription detail so employees can see the plan status
    (e.g. when it expires) while only admins can modify or renew it.
    """
    message = 'Solo los administradores pueden modificar este recurso.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(user, 'is_admin', False)
