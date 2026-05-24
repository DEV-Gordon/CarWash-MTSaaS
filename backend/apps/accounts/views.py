from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import BusinessUser, Business, Subscription
from .serializers import (
    RegisterBusinessSerializer, CarWashTokenSerializer,
    BusinessSerializer, SubscriptionSerializer, BusinessUserSerializer,
)


class LoginView(TokenObtainPairView):
    # Custom login view that uses a custom serializer to include additional user and business info in the JWT token response.
    serializer_class = CarWashTokenSerializer
    permission_classes = [permissions.AllowAny]

class RegisterView(generics.CreateAPIView):
    # Registration view that allows new businesses to sign up along with an admin user. It returns JWT tokens upon successful registration for immediate authentication.
    serializer_class = RegisterBusinessSerializer
    permission_classes = [permissions.AllowAny]

    # Override the create method to return custom response data including tokens and user/business info after registration.
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Return tokens immediately after registration
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Negocio registrado exitosamente. Tienes 14 días de prueba.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
            },
            'business': BusinessSerializer(user.business).data,
        }, status=status.HTTP_201_CREATED)

class MeView(APIView):
    # Return current user + business + subscription detail.
    # This endpoint allows authenticated users to retrieve their own profile information along with their associated business and subscription details, providing a comprehensive overview of their account status in a single request.
    permission_classes = [permissions.IsAuthenticated]

    # Override the get method to return the authenticated user's profile information along with their business and subscription details, ensuring that the subscription status is updated before returning the data.
    def get(self, request):
        user = request.user
        business = user.business
        data = BusinessUserSerializer(user).data
        # If the user is associated with a business, include the business and subscription details in the response. The subscription status is checked and updated before serialization to ensure accurate information is returned.
        if business:
            sub = getattr(business, 'subscription', None)
            if sub:
                sub.check_and_update_status()
            data['subscription'] = SubscriptionSerializer(sub).data if sub else None
        return Response(data)

class SubscriptionDetailView(generics.RetrieveUpdateAPIView):
    # Get or update the subscription for the authenticated business.
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.business.subscription

class RenewSubscriptionView(APIView):
    # Manually renew/activate the subscription for one month.
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.is_admin:
            return Response({'detail': 'Solo administradores pueden renovar la suscripción.'},
                            status=status.HTTP_403_FORBIDDEN)
        sub = user.business.subscription
        sub.renew(months=1)
        return Response({
            'message': 'Suscripción renovada correctamente.',
            'subscription': SubscriptionSerializer(sub).data,
        })

class BusinessDetailView(generics.RetrieveUpdateAPIView):
    # Get or update the authenticated user's business info.
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.business


class UserListView(generics.ListCreateAPIView):
    # Admin can list and create users within the same business.
    serializer_class = BusinessUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BusinessUser.objects.filter(business=self.request.user.business)

    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)
