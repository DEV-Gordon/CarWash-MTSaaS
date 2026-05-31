from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import BusinessUser, Business, Subscription


class BusinessSerializer(serializers.ModelSerializer):
    subscription_status = serializers.ReadOnlyField()
    is_subscription_active = serializers.ReadOnlyField()

    class Meta:
        model = Business
        fields = [
            'id', 'name', 'email', 'phone', 'address',
            'owner_name', 'logo', 'created_at',
            'is_active', 'subscription_status', 'is_subscription_active',
        ]
        read_only_fields = ['id', 'created_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    days_remaining = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'business', 'business_name', 'plan', 'status', 'status_display',
            'start_date', 'end_date', 'price', 'auto_renew',
            'notes', 'days_remaining', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BusinessUserSerializer(serializers.ModelSerializer):
    business_detail = BusinessSerializer(source='business', read_only=True)
    # Username permisivo: admite espacios y nombres normales (ej. "Juan Perez"),
    # a diferencia del validador estricto de Django. Mantiene la unicidad.
    username = serializers.CharField(
        max_length=150,
        validators=[UniqueValidator(
            queryset=BusinessUser.objects.all(),
            message='El usuario ya existe.',
        )],
    )
    # Contraseña inicial: solo se escribe al crear, nunca se devuelve en las respuestas.
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = BusinessUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'role', 'business', 'business_detail', 'password',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        # Usa set_password para hashear la clave; así el usuario puede iniciar sesión de inmediato.
        password = validated_data.pop('password', None)
        user = BusinessUser(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        # Permite cambiar la contraseña al editar; si no se envía, se conserva la actual.
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user


class RegisterBusinessSerializer(serializers.Serializer):
    """Register a new business + admin user in one step."""
    # Business fields
    business_name = serializers.CharField(max_length=150)
    business_email = serializers.EmailField()
    owner_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    # User fields
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Las contraseñas no coinciden.'})
        if Business.objects.filter(email=data['business_email']).exists():
            raise serializers.ValidationError({'business_email': 'Ya existe un negocio con este correo.'})
        if BusinessUser.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({'username': 'El usuario ya existe.'})
        return data

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta

        business = Business.objects.create(
            name=validated_data['business_name'],
            email=validated_data['business_email'],
            owner_name=validated_data['owner_name'],
            phone=validated_data.get('phone', ''),
            address=validated_data.get('address', ''),
        )
        # 14-day free trial
        today = timezone.now().date()
        Subscription.objects.create(
            business=business,
            plan=Subscription.PLAN_MONTHLY,
            status=Subscription.STATUS_TRIAL,
            start_date=today,
            end_date=today + timedelta(days=14),
            price=299.00,
        )
        user = BusinessUser.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            business=business,
            role=BusinessUser.ROLE_ADMIN,
        )
        return user


class CarWashTokenSerializer(TokenObtainPairSerializer):
    """Custom JWT token that includes business and subscription info."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        token['business_id'] = user.business_id
        token['business_name'] = user.business.name if user.business else None
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        business = user.business

        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name(),
            'role': user.role,
        }

        if business:
            sub = getattr(business, 'subscription', None)
            if sub:
                sub.check_and_update_status()
            data['business'] = {
                'id': business.id,
                'name': business.name,
                'subscription_status': business.subscription_status,
                'is_subscription_active': business.is_subscription_active,
            }
        return data
